import * as fs from 'fs';

export default class FileSystemService {
  public readFileAsString(path: string): string {
    return fs.readFileSync(path).toString();
  }

  public writeStringToFile(data: string, path: string): void {
    fs.writeFileSync(path, data);
  }

  public doesFolderExist(path: string): boolean {
    return fs.existsSync(path);
  }

  public createFolder(path: string): void {
    fs.mkdirSync(path, {
      recursive: true,
    });
  }

  private static _instance: FileSystemService;
  public static get instance(): FileSystemService {
    return this._instance ?? (this._instance = new FileSystemService());
  }

  public static setMockedInstance(instance: FileSystemService) {
    this._instance = instance;
  }
}
