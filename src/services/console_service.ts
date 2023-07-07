import express from 'express';
import { Server } from 'http';
import { ConnectResult } from '../models/app_models';

import openurl from 'openurl';
import { getLogger } from '../logger';

const HANDLER_PORT = 8080;

export enum Host {
  none = 'none',
  netlify = 'netlify',
}

export default class ConsoleService {
  private readonly logger = getLogger();

  /**
   * Makes a connect request to the Motionlink Console.
   *
   * Returns the Motionlink vars and host site url string on success, throws on error.
   *
   * If given host was none, the returned site url is empty.
   */
  public async connect(githubRepoUrl: string, host: Host, consoleUrl?: string): Promise<ConnectResult> {
    return new Promise((resolve, reject) => {
      const app = express();
      if (!Boolean(consoleUrl)) {
        consoleUrl = 'https://app.motionlink.co';
      }

      let server: Server;
      app.get('/callback', (req, res) => {
        const status = req.query.status === 'true';
        if (status) {
          resolve({
            secureUrl: req.query.secureUrl as any,
            vars: req.query.vars as any,
          });
        } else {
          reject(req.query.message);
        }

        res.redirect(`${consoleUrl}/connect_completed`);
        setTimeout(() => server.close(), 2000);
      });

      server = app.listen(HANDLER_PORT, () => {
        const redirectUri = `http://localhost:${HANDLER_PORT}/callback`;

        const queryUrl = new URL(`${consoleUrl!}/market`);
        queryUrl.searchParams.append('source', githubRepoUrl);
        queryUrl.searchParams.append('host', host);
        queryUrl.searchParams.append('redirect_uri', redirectUri);
        queryUrl.searchParams.append('q', 'connect');

        this.logger.logWithColor(queryUrl.href);
        try {
          openurl.open(queryUrl.href);
        } catch (e) {
          console.error('...No browser detected. Copy and paste link into your browser.');
        }
      });
    });
  }

  private static _instance: ConsoleService;
  public static get instance(): ConsoleService {
    return this._instance ?? (this._instance = new ConsoleService());
  }

  public static setMockedInstance(instance: ConsoleService) {
    this._instance = instance;
  }
}
