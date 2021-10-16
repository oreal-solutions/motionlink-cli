import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionDatabaseAssociation, Token } from '../models/app_models';
import { Context, DatabaseRule, NotionBlock, NotionDatabase, NotionPage, TemplateRule } from '../models/config_models';
import { render } from 'mustache';
import NotionService from './notion_service';
import fs = require('fs');

export interface BuildService {
  build: (templateRules: TemplateRule[], databaseAssociations: NotionDatabaseAssociation[]) => Promise<void>;
  _getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists: (
    rule: DatabaseRule,
    databaseAssociations: NotionDatabaseAssociation[],
  ) => NotionDatabaseAssociation;
  _getFileExtension: (path: string) => string;
}

export function newBuildService(): BuildService {
  return new _BuildService();
}

class _BuildService implements BuildService {
  public async build(templateRules: TemplateRule[], databaseAssociations: NotionDatabaseAssociation[]): Promise<void> {
    for (const templateRule of templateRules) {
      const context: Context = {
        others: [],
        genMarkdownForPage: this.genMarkdownForPage,
      };

      context.others = await this.fetchAllSecondaryDatabases(templateRule.alsoUses, databaseAssociations, context);
      const primaryAssociation = this._getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists(
        templateRule.uses,
        databaseAssociations,
      );

      await this.fetchDatabase({
        databaseRule: templateRule.uses,
        association: primaryAssociation,
        context: context,
        onPostPageMapping: (notionPage) => this.populatePage(templateRule, notionPage),
      });
    }
  }

  private async populatePage(templateRule: TemplateRule, page: NotionPage): Promise<void> {
    const title = page.data.properties.title;
    let titleString = page.data.id;
    if (title.type === 'title' && title.title.length !== 0) titleString = title.title[0].plain_text;

    const template = this.readCacheableStringFile(templateRule.template);
    const out = render(template, page);
    fs.writeFileSync(titleString, out);
  }

  private async fetchAllSecondaryDatabases(
    databaseRules: DatabaseRule[],
    databaseAssociations: NotionDatabaseAssociation[],
    context: Context,
  ): Promise<NotionDatabase[]> {
    const secondaryDatabases: NotionDatabase[] = [];
    for (const databaseRule of databaseRules) {
      const association = this._getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists(
        databaseRule,
        databaseAssociations,
      );
      const db = await this.fetchDatabase({
        databaseRule: databaseRule,
        association: association,
        context: context,
        onPostPageMapping: async (_) => {},
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

    const pages: NotionPage[] = [];
    for await (const pageData of NotionService.instance.queryForDatabasePages({
      databaseId: args.association.notionDatabaseId,
      withToken: args.association.notionIntegrationToken,
      takeOnly: args.databaseRule.takeOnly,
      sort: args.databaseRule.sort,
      filter: args.databaseRule.filter,
    })) {
      const blocks: NotionBlock[] = [];
      for await (const blockData of NotionService.instance.getPageBlocks({
        pageId: pageData.id,
        withToken: args.association.notionIntegrationToken,
      })) {
        blocks.push(await this.parseBlock(blockData, args.association.notionIntegrationToken));
      }

      let page: NotionPage = {
        otherData: {},
        data: pageData,
        blocks: blocks,
      };

      if (args.databaseRule.map) page = args.databaseRule.map(page, args.context);
      await args.onPostPageMapping(page);
      pages.push(page);
    }

    return {
      pages: pages,
      data: databaseData,
    };
  }

  private async parseBlock(data: GetBlockResponse, notionToken: Token): Promise<NotionBlock> {
    if (data.has_children) {
      return {
        data: data,
        children: await this.getBlockChildren(data.id, notionToken),
      };
    } else {
      return {
        data: data,
        children: [],
      };
    }
  }

  private async getBlockChildren(blockId: string, withToken: Token): Promise<NotionBlock[]> {
    const children: NotionBlock[] = [];
    for await (const child of NotionService.instance.getBlockChildren({
      blockId: blockId,
      withToken: withToken,
    })) {
      children.push(await this.parseBlock(child, withToken));
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
