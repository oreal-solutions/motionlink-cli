import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionDatabaseAssociation, Token } from '../models/app_models';
import { Context, DatabaseRule, NotionBlock, NotionDatabase, NotionPage, TemplateRule } from '../models/config_models';
import { render } from 'mustache';
import NotionService from './notion_service';
import * as fs from 'fs';

export interface BuildService {
  build: (templateRules: TemplateRule[], databaseAssociations: NotionDatabaseAssociation[]) => Promise<void>;
  _getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists: (
    rule: DatabaseRule,
    databaseAssociations: NotionDatabaseAssociation[],
  ) => NotionDatabaseAssociation;
  _getFileExtension: (path: string) => string;
}

export function newBuildService(): BuildService {
  return new BuildServiceImpl();
}

class BuildServiceImpl implements BuildService {
  public async build(templateRules: TemplateRule[], databaseAssociations: NotionDatabaseAssociation[]): Promise<void> {
    for (const templateRule of templateRules) {
      const ctx: Context = {
        others: [],
        genMarkdownForPage: this.genMarkdownForPage,
      };

      ctx.others = await this.fetchAllSecondaryDatabases(templateRule.alsoUses, databaseAssociations, ctx);
      const primaryAssociation = this._getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists(
        templateRule.uses,
        databaseAssociations,
      );

      await this.fetchDatabase({
        databaseRule: templateRule.uses,
        association: primaryAssociation,
        context: ctx,
        onPostPageMapping: (notionPage) => this.populatePage(templateRule, notionPage),
      });
    }
  }

  private async populatePage(templateRule: TemplateRule, page: NotionPage): Promise<void> {
    const title = page.data.properties.title;
    let titleString = page.data.id;
    if (title && title.type === 'title' && title.title.length !== 0) titleString = title.title[0].plain_text;

    const template = this.readCacheableStringFile(templateRule.template);
    const out = render(template, page);
    fs.writeFileSync(templateRule.outDir + '/' + titleString, out);
  }

  private async fetchAllSecondaryDatabases(
    databaseRules: DatabaseRule[],
    databaseAssociations: NotionDatabaseAssociation[],
    ctx: Context,
  ): Promise<NotionDatabase[]> {
    const secondaryDatabases: NotionDatabase[] = [];
    for (const dbRule of databaseRules) {
      const dbAssociation = this._getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists(
        dbRule,
        databaseAssociations,
      );
      const db = await this.fetchDatabase({
        databaseRule: dbRule,
        association: dbAssociation,
        context: ctx,
        onPostPageMapping: async (_) => undefined,
      });

      secondaryDatabases.push(db);
    }

    return secondaryDatabases;
  }

  private async fetchDatabase(args: {
    databaseRule: DatabaseRule;
    association: NotionDatabaseAssociation;
    context: Context;
    onPostPageMapping: (notionPage: NotionPage) => Promise<void>;
  }): Promise<NotionDatabase> {
    const databaseData = await NotionService.instance.getDatabase({
      withId: args.association.notionDatabaseId,
      withToken: args.association.notionIntegrationToken,
    });

    const notionPages: NotionPage[] = [];
    for await (const pageData of NotionService.instance.queryForDatabasePages({
      databaseId: args.association.notionDatabaseId,
      withToken: args.association.notionIntegrationToken,
      takeOnly: args.databaseRule.takeOnly,
      sort: args.databaseRule.sort,
      filter: args.databaseRule.filter,
    })) {
      const notionBlocks: NotionBlock[] = [];
      for await (const blockData of NotionService.instance.getPageBlocks({
        pageId: pageData.id,
        withToken: args.association.notionIntegrationToken,
      })) {
        notionBlocks.push(await this.parseBlock(blockData, args.association.notionIntegrationToken));
      }

      let page: NotionPage = {
        otherData: {},
        data: pageData,
        blocks: notionBlocks,
      };

      if (args.databaseRule.map) page = args.databaseRule.map(page, args.context);
      await args.onPostPageMapping(page);
      notionPages.push(page);
    }

    return {
      pages: notionPages,
      data: databaseData,
    };
  }

  private async parseBlock(blockData: GetBlockResponse, notionToken: Token): Promise<NotionBlock> {
    if (blockData.has_children) {
      return {
        data: blockData,
        children: await this.getBlockChildren(blockData.id, notionToken),
      };
    } else {
      return {
        data: blockData,
        children: [],
      };
    }
  }

  private async getBlockChildren(pageBlockId: string, token: Token): Promise<NotionBlock[]> {
    const children: NotionBlock[] = [];
    for await (const child of NotionService.instance.getBlockChildren({
      blockId: pageBlockId,
      withToken: token,
    })) {
      children.push(await this.parseBlock(child, token));
    }

    return children;
  }

  private genMarkdownForPage(notionPage: NotionPage): string {
    return '# Markdown';
  }

  private readCacheableStringFile(path: string): string {
    if (this.fileChache.get(path)) return this.fileChache.get(path) as string;

    const text = fs.readFileSync(path).toString();
    this.fileChache.set(path, text);
    return text;
  }

  public _getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists(
    rule: DatabaseRule,
    databaseAssociations: NotionDatabaseAssociation[],
  ): NotionDatabaseAssociation {
    const filtered = databaseAssociations.filter((association) => association.name === rule.database);
    if (filtered.length === 0) throw new Error(`The database association "${rule.database}" does not exist.`);

    return filtered[0];
  }

  public _getFileExtension(path: string) {
    const index = path.lastIndexOf('.');
    if (index < 0) return '';

    return path.substring(index + 1);
  }

  private fileChache: Map<string, string> = new Map();
}
