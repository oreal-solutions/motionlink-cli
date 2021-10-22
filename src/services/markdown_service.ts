import { NotionPage } from '../models/config_models';

export default class MarkdownService {
  public genMarkdownForPage(page: NotionPage): string {
    // TODO: Implement
    return '';
  }

  private static _instance: MarkdownService;
  public static get instance(): MarkdownService {
    return this._instance ?? (this._instance = new MarkdownService());
  }

  public static setMockedInstance(instance: MarkdownService) {
    this._instance = instance;
  }
}
