import { render } from 'mustache';

export default class MustacheService {
  public render(view: object, template: string): string {
    return render(template, view);
  }

  private static _instance: MustacheService;
  public static get instance(): MustacheService {
    return this._instance ?? (this._instance = new MustacheService());
  }

  public static setMockedInstance(instance: MustacheService) {
    this._instance = instance;
  }
}
