import { GetBlockResponse, GetDatabaseResponse, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';

export type NotionBlock = {
  data: GetBlockResponse;
  children: NotionBlock[];
};

export type NotionPage = {
  otherData: object;
  data: GetPageResponse;
  blocks: NotionBlock[];
};

export type NotionDatabase = {
  pages: NotionPage[];
  data: GetDatabaseResponse;
};

export type Context = {
  others: NotionDatabase[];
  genMarkdownForPage: (notionPage: NotionPage) => string;
};

export type SortParams =
  | { property: string; direction: 'ascending' | 'descending' }
  | {
      timestamp: 'created_time' | 'last_edited_time';
      direction: 'ascending' | 'descending';
    };

export type DatabaseRule = {
  database: string;
  takeOnly?: number;
  map?: (notionPage: NotionPage, context: Context) => NotionPage;
  sort?: SortParams;

  /**
   * See: https://developers.notion.com/reference/post-database-query#post-database-query-filter
   */
  filter?: object;
};

export type TemplateRule = {
  template: string;
  uses: DatabaseRule;
  alsoUses: DatabaseRule[];
};
