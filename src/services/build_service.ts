import { GetBlockResponse, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionDatabaseAssociation, Token } from '../models/app_models';
import { Context, DatabaseRule, NotionBlock, NotionDatabase, NotionPage, TemplateRule } from '../models/config_models';
import NotionService from './notion_service';
import FileSystemService from './file_system_service';
import MustacheService from './mustache_service';
import MarkdownService, { getMedia } from './markdown_service';
import PostProcessingService from './post_processing_service';

export interface BuildService {
  build: (templateRules: TemplateRule[], databaseAssociations: NotionDatabaseAssociation[]) => Promise<void>;
}

export function newBuildService(): BuildService {
  return new BuildServiceImpl();
}

class BuildServiceImpl implements BuildService {
  public async build(templateRules: TemplateRule[], databaseAssociations: NotionDatabaseAssociation[]): Promise<void> {
    for (const rule of templateRules) {
      await this.makeTemplateRuleBuilder().build(rule, databaseAssociations);
    }
  }

  private makeTemplateRuleBuilder(): TemplateRuleBuilder {
    const fileExtensionFinder = new FileExtensionFinder();
    const cachingFileReader = new CachingFileReader();
    const templateRuleOutputWriter = new TemplateRuleOutputWriter()
      .setFileExtensionFinder(fileExtensionFinder)
      .setCachingFileReader(cachingFileReader);

    const blockChildrenFetcher = new BlockChildrenFetcher();
    const databaseFetcher = new DatabaseFetcher().setBlockChildrenFether(blockChildrenFetcher);

    const databaseAssociationFinder = new DatabaseAssociationFinder();
    const secondaryDatabasesFetcher = new SecondaryDatabasesFetcher()
      .setDatabaseFetcher(databaseFetcher)
      .setDatabaseAssociationFinder(databaseAssociationFinder);

    return new TemplateRuleBuilder()
      .setSecondaryDatabasesFetcher(secondaryDatabasesFetcher)
      .setDatabaseFetcher(databaseFetcher)
      .setTemplateRuleOutputWriter(templateRuleOutputWriter)
      .setDatabaseAssociationFinder(databaseAssociationFinder);
  }
}

export class FileExtensionFinder {
  public findFileExtensionOf(path: string): string {
    const index = path.lastIndexOf('.');
    if (index < 0) return '';

    return path.substring(index);
  }
}

export class DatabaseAssociationFinder {
  public findDatabaseAssociationFor(
    rule: DatabaseRule,
    databaseAssociations: NotionDatabaseAssociation[],
  ): NotionDatabaseAssociation {
    const filtered = databaseAssociations.filter((association) => association.name === rule.database);
    if (filtered.length === 0) throw new Error(`The database association "${rule.database}" does not exist.`);

    return filtered[0];
  }
}

export class CachingFileReader {
  public readAsString(path: string): string {
    if (this.fileChache.get(path)) return this.fileChache.get(path) as string;

    const text = FileSystemService.instance.readFileAsString(path);
    this.fileChache.set(path, text);
    return text;
  }

  private fileChache: Map<string, string> = new Map();
}

export class TemplateRuleOutputWriter {
  public async write(page: NotionPage, pageTemplateRule: TemplateRule): Promise<void> {
    const templateFileContents = this.fileReader!.readAsString(pageTemplateRule.template);
    const out = MustacheService.instance.render(page, templateFileContents);

    if (!FileSystemService.instance.doesFolderExist(pageTemplateRule.outDir)) {
      FileSystemService.instance.createFolder(pageTemplateRule.outDir);
    }

    const outFilePath =
      pageTemplateRule.outDir +
      '/' +
      page._title +
      this.fileExtensionFinder!.findFileExtensionOf(pageTemplateRule.template);

    PostProcessingService.instance.submit(out, outFilePath, page.data.id);
  }

  public setFileExtensionFinder(fileExtensionFinder: FileExtensionFinder) {
    this.fileExtensionFinder = fileExtensionFinder;
    return this;
  }

  public setCachingFileReader(reader: CachingFileReader) {
    this.fileReader = reader;
    return this;
  }

  private fileReader?: CachingFileReader;
  private fileExtensionFinder?: FileExtensionFinder;
}

export class BlockChildrenFetcher {
  public async fetchChildren(bId: string, notionToken: Token): Promise<NotionBlock[]> {
    const promises = new Array<Promise<NotionBlock>>();
    for await (const child of NotionService.instance.getBlockChildren({
      blockId: bId,
      withToken: notionToken,
    })) {
      promises.push(this._parseBlock(child, notionToken));
    }

    return Promise.all(promises);
  }

  private async _parseBlock(blockData: GetBlockResponse, notionToken: Token): Promise<NotionBlock> {
    if (blockData.has_children) {
      return {
        data: blockData,
        children: await this.fetchChildren(blockData.id, notionToken),
      };
    } else {
      return {
        data: blockData,
        children: [],
      };
    }
  }
}

export class DatabaseFetcher {
  public async fetchDatabase(args: {
    databaseRule: DatabaseRule;
    association: NotionDatabaseAssociation;
    context: Context;
    onPostPageMapping: (notionPage: NotionPage) => Promise<NotionPage>;
  }): Promise<NotionDatabase> {
    const database = await NotionService.instance.getDatabase({
      withId: args.association.notionDatabaseId,
      withToken: args.association.notionIntegrationToken,
    });

    const pagesData = NotionService.instance.queryForDatabasePages({
      databaseId: args.association.notionDatabaseId,
      withToken: args.association.notionIntegrationToken,
      takeOnly: args.databaseRule.takeOnly,
      sort: args.databaseRule.sort,
      filter: args.databaseRule.filter,
    });

    const promises = new Array<Promise<NotionPage>>();

    const fetchPage = async (pageData: GetPageResponse): Promise<NotionPage> => {
      let pageBlocks: NotionBlock[] = [];
      if (Boolean(args.databaseRule.fetchBlocks)) {
        pageBlocks = await this.blockChildrenFetcher!.fetchChildren(
          pageData.id,
          args.association.notionIntegrationToken,
        );
      }

      let page: NotionPage = {
        _title: pageData.id,
        otherData: {},
        data: pageData,
        blocks: pageBlocks,
      };

      if (args.databaseRule.map) {
        page = args.databaseRule.map(page, args.context);
      }

      await args.onPostPageMapping(page);
      return page;
    };

    for await (const pageData of pagesData) {
      promises.push(fetchPage(pageData));
    }

    const outPages = await Promise.all(promises);

    return {
      data: database,
      pages: outPages,
    };
  }

  public setBlockChildrenFether(blockChildrenFetcher: BlockChildrenFetcher) {
    this.blockChildrenFetcher = blockChildrenFetcher;
    return this;
  }

  private blockChildrenFetcher: BlockChildrenFetcher | undefined;
}

export class SecondaryDatabasesFetcher {
  public async fetchAll(
    databaseRules: DatabaseRule[],
    databaseAssociations: NotionDatabaseAssociation[],
    ctx: Context,
  ): Promise<object> {
    const others: any = {};
    const promises = new Array<Promise<{ rule: DatabaseRule; db: NotionDatabase }>>();

    for (const dbRule of databaseRules) {
      const dbAssociation = this.databaseAssociationFinder!.findDatabaseAssociationFor(dbRule, databaseAssociations);

      promises.push(
        new Promise((resolve, reject) => {
          this.databaseFetcher!.fetchDatabase({
            databaseRule: dbRule,
            association: dbAssociation,
            context: ctx,
            onPostPageMapping: async (_) => ({} as any),
          })
            .then((database) =>
              resolve({
                rule: dbRule,
                db: database,
              }),
            )
            .catch((e) => reject(e));
        }),
      );
    }

    for (const value of await Promise.all(promises)) {
      others[value.rule.database] = value.db;
    }

    return others;
  }

  public setDatabaseFetcher(databaseFetcher: DatabaseFetcher) {
    this.databaseFetcher = databaseFetcher;
    return this;
  }

  public setDatabaseAssociationFinder(finder: DatabaseAssociationFinder) {
    this.databaseAssociationFinder = finder;
    return this;
  }

  private databaseFetcher: DatabaseFetcher | undefined;
  private databaseAssociationFinder: DatabaseAssociationFinder | undefined;
}

export class TemplateRuleBuilder {
  public async build(rule: TemplateRule, databaseAssociations: NotionDatabaseAssociation[]): Promise<void> {
    const ctx: Context = {
      others: {},
      genMarkdownForBlocks: (blocks) => MarkdownService.instance.genMarkdownForBlocks(blocks, rule),
      fetchMedia: (fileObject) => getMedia(fileObject, rule),
    };

    ctx.others = await this.secondaryDatabasesFetcher!.fetchAll(rule.alsoUses, databaseAssociations, ctx);
    const primaryAssociation = this.databaseAssociationFinder!.findDatabaseAssociationFor(
      rule.uses,
      databaseAssociations,
    );

    await this.databaseFetcher?.fetchDatabase({
      databaseRule: rule.uses,
      association: primaryAssociation,
      context: ctx,
      onPostPageMapping: async (notionPage) => {
        await this.templateRuleOutputWriter!.write(notionPage, rule);
        return notionPage;
      },
    });
  }

  public setSecondaryDatabasesFetcher(secondaryDatabasesFetcher: SecondaryDatabasesFetcher) {
    this.secondaryDatabasesFetcher = secondaryDatabasesFetcher;
    return this;
  }

  public setDatabaseFetcher(databaseFetcher: DatabaseFetcher) {
    this.databaseFetcher = databaseFetcher;
    return this;
  }

  public setTemplateRuleOutputWriter(writer: TemplateRuleOutputWriter) {
    this.templateRuleOutputWriter = writer;
    return this;
  }

  public setDatabaseAssociationFinder(finder: DatabaseAssociationFinder) {
    this.databaseAssociationFinder = finder;
    return this;
  }

  private secondaryDatabasesFetcher: SecondaryDatabasesFetcher | undefined;
  private databaseFetcher: DatabaseFetcher | undefined;
  private templateRuleOutputWriter: TemplateRuleOutputWriter | undefined;
  private databaseAssociationFinder: DatabaseAssociationFinder | undefined;
}
