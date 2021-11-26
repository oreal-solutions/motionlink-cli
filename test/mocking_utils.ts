import { GetBlockResponse, GetDatabaseResponse, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionDatabaseAssociation, Token } from '../src/models/app_models';
import {
  Context,
  DatabaseRule,
  NotionBlock,
  NotionDatabase,
  NotionPage,
  SortsParams,
  TemplateRule,
} from '../src/models/config_models';
import {
  BlockChildrenFetcher,
  CachingFileReader,
  DatabaseAssociationFinder,
  DatabaseFetcher,
  FileExtensionFinder,
  SecondaryDatabasesFetcher,
  TemplateRuleOutputWriter,
} from '../src/services/build_service';
import FileSystemService from '../src/services/file_system_service';
import MediaService from '../src/services/media_service';
import MustacheService from '../src/services/mustache_service';
import NotionService from '../src/services/notion_service';
import PostProcessingService from '../src/services/post_processing_service';

export function setMockedFileSystemService(mock: {
  readFileAsString?: (path: string) => string;
  writeStringToFile?: (data: string, path: string) => void;
  doesFolderExist?: (path: string) => boolean;
  createFolder?: (path: string) => void;
}) {
  FileSystemService.setMockedInstance(mock as FileSystemService);
}

export function setMockedMustacheService(mock: { render: (view: object, template: string) => string }) {
  MustacheService.setMockedInstance(mock);
}

export function setMockedNotionService(mock: {
  getDatabase?: (args: { withId: string; withToken: Token }) => Promise<GetDatabaseResponse>;
  queryForDatabasePages?: (args: {
    databaseId: string;
    withToken: Token;
    takeOnly?: number;
    sort?: SortsParams;
    filter?: object;
  }) => AsyncGenerator<GetPageResponse, void, undefined>;
  getPageBlocks?: (args: { pageId: string; withToken: Token }) => AsyncGenerator<GetBlockResponse, void, undefined>;
  getBlockChildren?: (args: { blockId: string; withToken: Token }) => AsyncGenerator<GetBlockResponse, void, undefined>;
}) {
  NotionService.setMockedInstance(mock as NotionService);
}

export function setMockedMediaService(mock: {
  stageFetchRequest?: (url: string, templateRule: TemplateRule) => string;
  commit?: () => Promise<void>;
}) {
  MediaService.setMockedInstance(mock as MediaService);
}

export function setMockedPostProcessingService(mock: {
  submit?: (content: string, pgPage: string, pgId: string) => void;
  flush?: () => void;
}) {
  PostProcessingService.setMockedInstance(mock as PostProcessingService);
}

export function asMockedFileExtensionFinder(mock: { findFileExtensionOf: (path: string) => string }) {
  return mock as FileExtensionFinder;
}

export function asMockedDatabaseAssociationFinder(mock: {
  findDatabaseAssociationFor: (
    rule: DatabaseRule,
    databaseAssociations: NotionDatabaseAssociation[],
  ) => NotionDatabaseAssociation;
}) {
  return mock as DatabaseAssociationFinder;
}

export function asMockedCachingFileReader(mock: { readAsString: (path: string) => string }) {
  return mock as CachingFileReader;
}

export function asMockedBlockChildrenFetcher(mock: {
  fetchChildren: (blockId: string, notionToken: Token) => Promise<NotionBlock[]>;
}) {
  return mock as BlockChildrenFetcher;
}

export function asMockedDatabaseFetcher(mock: {
  fetchDatabase: (args: {
    databaseRule: DatabaseRule;
    association: NotionDatabaseAssociation;
    context: Context;
    onPostPageMapping: (notionPage: NotionPage) => Promise<NotionPage>;
  }) => Promise<NotionDatabase>;
}) {
  return mock as DatabaseFetcher;
}

export function asMockedSecondaryDatabaseFetcher(mock: {
  fetchAll: (
    databaseRules: DatabaseRule[],
    databaseAssociations: NotionDatabaseAssociation[],
    ctx: Context,
  ) => Promise<object>;
}) {
  return mock as SecondaryDatabasesFetcher;
}

export function asMockedTemplateRuleOutputWriter(mock: {
  write: (page: NotionPage, pageTemplateRule: TemplateRule) => Promise<void>;
}) {
  return mock as TemplateRuleOutputWriter;
}
