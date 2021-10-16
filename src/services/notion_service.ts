import { GetBlockResponse, GetDatabaseResponse, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { Token } from '../models/app_models';
import { SortParams } from '../models/config_models';

export default class NotionService {
  public async getDatabase(args: { withId: string; withToken: Token }): Promise<GetDatabaseResponse> {
    return {} as any;
  }

  public async *queryForDatabasePages(args: {
    databaseId: string;
    withToken: Token;
    takeOnly?: number;
    sort?: SortParams;
    filter?: object;
  }): AsyncGenerator<GetPageResponse, void, undefined> {}

  public async *getPageBlocks(args: {
    pageId: string;
    withToken: Token;
  }): AsyncGenerator<GetBlockResponse, void, undefined> {}

  public async *getBlockChildren(args: {
    blockId: string;
    withToken: Token;
  }): AsyncGenerator<GetBlockResponse, void, undefined> {}

  private static _instance: NotionService;
  public static get instance(): NotionService {
    return this._instance ?? (this._instance = new NotionService());
  }
}
