import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionDatabaseAssociation, Token } from '../models/app_models';
import { Context, DatabaseRule, NotionBlock, NotionDatabase, NotionPage, TemplateRule } from '../models/config_models';
import NotionService from './notion_service';
import FileSystemService from './file_system_service';
import MustacheService from './mustache_service';
import MarkdownService from './markdown_service';

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

    FileSystemService.instance.writeStringToFile(out, outFilePath);
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
  public async fetchChildren(blockId: string, notionToken: Token): Promise<NotionBlock[]> {
    const children: NotionBlock[] = [];
    for await (const child of NotionService.instance.getBlockChildren({
      blockId: blockId,
      withToken: notionToken,
    })) {
      children.push(await this._parseBlock(child, notionToken));
    }

    return children;
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

    const outPages: NotionPage[] = [];
    const pagesData = NotionService.instance.queryForDatabasePages({
      databaseId: args.association.notionDatabaseId,
      withToken: args.association.notionIntegrationToken,
      takeOnly: args.databaseRule.takeOnly,
      sort: args.databaseRule.sort,
      filter: args.databaseRule.filter,
    });

    for await (const pageData of pagesData) {
      const pageBlocks = await this.blockChildrenFetcher!.fetchChildren(
        pageData.id,
        args.association.notionIntegrationToken,
      );

      let page: NotionPage = {
        _title: pageData.id,
        otherData: {},
        data: pageData,
        blocks: pageBlocks,
      };

      if (args.databaseRule.map) {
        page = args.databaseRule.map(page, args.context);
      }

      args.onPostPageMapping(page);
      outPages.push(page);
    }

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

    for (const dbRule of databaseRules) {
      const dbAssociation = this.databaseAssociationFinder!.findDatabaseAssociationFor(dbRule, databaseAssociations);

      const db = await this.databaseFetcher!.fetchDatabase({
        databaseRule: dbRule,
        association: dbAssociation,
        context: ctx,
        onPostPageMapping: async (_) => ({} as any),
      });

      others[dbRule.database] = db;
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
      others: [],
      genMarkdownForPage: MarkdownService.instance.genMarkdownForPage,
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
