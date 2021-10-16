import { Client } from '@notionhq/client';
import { GetBlockResponse, GetDatabaseResponse, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { Token } from '../models/app_models';
import { SortsParams } from '../models/config_models';
import { resultOf } from './notion_service_utils';

export default class NotionService {
  public getDatabase(args: { withId: string; withToken: Token }): Promise<GetDatabaseResponse> {
    const notion = this.initNotionClient(args.withToken);
    return resultOf(() =>
      notion.databases.retrieve({
        database_id: args.withId,
      }),
    );
  }

  public async *queryForDatabasePages(args: {
    databaseId: string;
    withToken: Token;
    takeOnly?: number;
    sort?: SortsParams;
    filter?: object;
  }): AsyncGenerator<GetPageResponse, void, undefined> {
    const notion = this.initNotionClient(args.withToken);
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    while (hasMore) {
      const response = await resultOf(() =>
        notion.databases.query({
          database_id: args.databaseId,
          page_size: args.takeOnly,
          sorts: args.sort,
          filter: args.filter as any,
          start_cursor: nextCursor,
        }),
      );

      yield* response.results;
      hasMore = response.has_more;
      nextCursor = response.next_cursor as any;
    }
  }

  public getPageBlocks(args: { pageId: string; withToken: Token }): AsyncGenerator<GetBlockResponse, void, undefined> {
    return this.getBlockChildren({
      blockId: args.pageId,
      withToken: args.withToken,
    });
  }

  public async *getBlockChildren(args: {
    blockId: string;
    withToken: Token;
  }): AsyncGenerator<GetBlockResponse, void, undefined> {
    const notion = this.initNotionClient(args.withToken);
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    while (hasMore) {
      const response = await resultOf(() =>
        notion.blocks.children.list({
          block_id: args.blockId,
          start_cursor: nextCursor,
        }),
      );

      yield* response.results;
      hasMore = response.has_more;
      nextCursor = response.next_cursor as any;
    }
  }

  private initNotionClient(notionToken: Token): Client {
    return new Client({
      auth: notionToken.token,
    });
  }

  private static _instance: NotionService;
  public static get instance(): NotionService {
    return this._instance ?? (this._instance = new NotionService());
  }
}
