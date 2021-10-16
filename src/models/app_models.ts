export type Token = {
  token: string;
};
export type Association = {
  key: string;
  value: string;
};

export type NotionDatabaseAssociation = {
  name: string;
  notionDatabaseId: string;
  notionIntegrationToken: Token;
};
