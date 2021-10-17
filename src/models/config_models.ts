import { GetBlockResponse, GetDatabaseResponse, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';

export type NotionBlock = {
  data: GetBlockResponse;
  children: NotionBlock[];
};

export type NotionPage = {
  otherData: object;
  data: GetPageResponse;
  blocks: NotionBlock[];

  /**
   * This value should be retrieved by users in map.
   * Default is page id.
   */
  _title?: string,
};

export type NotionDatabase = {
  pages: NotionPage[];
  data: GetDatabaseResponse;
};

export type Context = {
  // Object of other Notiondatabase objects
  others: object;
  genMarkdownForPage: (notionPage: NotionPage) => string;
};

type T =
  | {
      property: string;
      direction: 'ascending' | 'descending';
    }
  | {
      timestamp: 'created_time' | 'last_edited_time';
      direction: 'ascending' | 'descending';
    };

export type SortsParams = T[];

export type DatabaseRule = {
  database: string;
  takeOnly?: number;
  map?: (notionPage: NotionPage, context: Context) => NotionPage;
  sort?: SortsParams;

  /**
   * See: https://developers.notion.com/reference/post-database-query#post-database-query-filter
   */
  filter?: object;
};

export type TemplateRule = {
  template: string;
  outDir: string;
  uses: DatabaseRule;
  alsoUses: DatabaseRule[];
};
