import { StringResponseBody, Token } from '../models/app_models';
import axios from "axios";

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
    const response = await axios.post(endpoint, body);

    if (response.status !== 200) throw new Error(`${response.data}`);
    return (await response.data) as any;
  }

  private static _instance: MotionLinkApi;
  public static get instance(): MotionLinkApi {
    return this._instance ?? (this._instance = new MotionLinkApi());
  }
}
