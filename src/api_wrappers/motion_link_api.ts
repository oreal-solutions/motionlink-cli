import { StringResponseBody, Token } from '../models/app_models';
import axios, { AxiosError } from 'axios';

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

    try {
      const response = await axios.post(endpoint, body);
      return response.data as any;
    } catch (e) {
      const error = e as AxiosError;
      if (error.response && error.response.status === 500) {
        // Server reports all errors with 500 status code
        throw new Error(`${(error.response.data as any).message}`);
      } else {
        throw e;
      }
    }
  }

  private static _instance: MotionLinkApi;
  public static get instance(): MotionLinkApi {
    return this._instance ?? (this._instance = new MotionLinkApi());
  }
}
