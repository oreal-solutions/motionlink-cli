import { Token } from "../models/app_models";

// TODO: Implement
export default class MotionLinkApi {
  public async getNotionTokenForLink(linkAccessKey: string): Promise<Token> {
    return {} as any;
  }

  public async getNotionDatabaseIdForLink(linkAccessKey: string): Promise<string> {
    return "";
  }

  private static _instance: MotionLinkApi;
  public static get instance(): MotionLinkApi {
    return this._instance ?? (this._instance = new MotionLinkApi());
  }
}