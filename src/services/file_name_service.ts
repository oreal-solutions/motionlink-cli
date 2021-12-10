import { v4 } from 'uuid';

export default class FileNameService {
  public genUnique(): string {
    return v4();
  }

  private static _instance: FileNameService;
  public static get instance(): FileNameService {
    return this._instance ?? (this._instance = new FileNameService());
  }

  public static setMockedInstance(instance: FileNameService) {
    this._instance = instance;
  }
}
