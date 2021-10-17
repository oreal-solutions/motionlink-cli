import { StringResponseBody, Token } from '../models/app_models';
import fetch from 'node-fetch';

export default class MotionLinkApi {
  public getNotionTokenForLink(linkAccessKey: string): Promise<Token> {
    const accessKeyAsToken: Token = {
      token: linkAccessKey,
    };

    return this.callHttpFunction('getNotionTokenForLink', accessKeyAsToken);
  }

  public async getNotionDatabaseIdForLink(linkAccessKey: string): Promise<string> {
    const accessKeyAsToken: Token = {
      token: linkAccessKey,
    };

    const response = await this.callHttpFunction('getNotionDatabaseIdForLink', accessKeyAsToken);
    return (response as StringResponseBody).value;
  }

  private async callHttpFunction(name: string, body: object): Promise<any> {
    const endpoint = `https://us-central1-motionlink-aec23.cloudfunctions.net/cli_tool_service-api/${name}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(await response.text());

    return (await response.json()) as any;
  }

  private static _instance: MotionLinkApi;
  public static get instance(): MotionLinkApi {
    return this._instance ?? (this._instance = new MotionLinkApi());
  }
}
