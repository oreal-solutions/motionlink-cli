import { GetBlockResponse, GetDatabaseResponse, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { FileObject } from './notion_objects';

export type NotionBlock = {
  data: GetBlockResponse;
  children: NotionBlock[];
};

export type NotionPage = {
  otherData: object;
  data: GetPageResponse;
  blocks: NotionBlock[];

  /**
   * This value should be retrieved by users in DatabaseRule.map.
   * Default is page id.
   */
  _title?: string;
};

export type NotionDatabase = {
  pages: NotionPage[];
  data: GetDatabaseResponse;
};

export type Context = {
  /**
   * Object containing the `NotionDatabase`s pulled with the `DatabaseRule`s
   * in `alsoUses` of this `TemplateRule`.
   *
   * For example, `others.abc` will contain the `NotionDatabase` fetched by
   * the `DatabaseRule` in this `TemplateRule.alsoUses` whose `database` field is
   * `abc`. It will be undefined if there is no such `DatabaseRule`.
   */
  others: object;

  /**
   * Transforms the given blocks to markdown with the `BlockTransformers` in
   * `services/markdown_service`.
   *
   * The output of this function is nor formatted.
   *
   * You can modify the `BlockTransformers` and `ObjectTransformers` objects
   * to provide custom transformers or otherwise add new transformers. For
   * example, running `ObjectTransformers.equation = (object) => 'No Inline Equations'`
   * will cause `genMarkdownForBlocks` to render `'No Inline Equations'` whenever an inline
   * equation object is encountered while generating the markdown.
   *
   * Likewise, modify `BlockTransformers` to provide custom transformers for entire blocks.
   * For example:
   *
   * @example
   * const markdownService = require('motionlink-cli/lib/services/markdown_service');
   * const ObjectTransformers = markdownService.ObjectTransformers;
   *
   * ObjectTransformers.equation = (block) => '**No Equations allowed on this site!**';
   *
   * // ...
   */
  genMarkdownForBlocks: (blocks: NotionBlock[]) => string;

  /**
   * Returns the download url and caption for the given FileObject.
   *
   * If the media is hosted by Notion, it will be downloaded to a media folder in the
   * `outDir` of this TemplateRule and the returned `src` value will be the asset path
   * in `outDir`, else the file url will be returned as is given in the media object
   */
  fetchMedia: (object: FileObject) => { src: string; captionMarkdown: string };
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
  fetchBlocks?: boolean;
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
