import * as pathUtils from 'path';
import * as urlUtils from 'url';
import request from 'request';
import * as fs from 'fs';

import { TemplateRule } from '../models/config_models';
import mediaTypes from '../constants/media_types';
import FileSystemService from './file_system_service';
import FileNameService from './file_name_service';

/**
 * A service for fetching media assets from given Notion URLs.
 *
 * Uses Collect-Commit pattern.
 */
export default class MediaService {
  private readonly requests = new Map<string, { absolutePath: string; relativePath: string }>();

  public stageFetchRequest(url: string, templateRule: TemplateRule): string {
    const destinationController = new MediaDestinationController({
      forRule: templateRule,
    });

    const relativeDestination = destinationController.makeFileDestinationForAssetWithUrl(url);
    const absPath = MediaDestinationController.getAbsoluteDestinationPath(
      templateRule.outDir,
      templateRule.writeMediaTo,
      relativeDestination,
    );

    this.requests.set(url, {
      relativePath: relativeDestination,
      absolutePath: absPath,
    });

    return relativeDestination;
  }

  public async commit(): Promise<void> {
    const promises = new Array<Promise<void>>();

    for (const [url, destinationPath] of this.requests) {
      promises.push(
        new Promise((resolve, reject) => {
          const destination = fs.createWriteStream(destinationPath.absolutePath);
          request(url).pipe(destination).on('error', reject).on('finish', resolve);
        }),
      );
    }

    await Promise.all(promises);
  }

  private static _instance: MediaService;
  public static get instance(): MediaService {
    return this._instance ?? (this._instance = new MediaService());
  }

  public static setMockedInstance(instance: MediaService) {
    this._instance = instance;
  }
}

export class MediaDestinationController {
  private templateRule: TemplateRule;

  constructor(args: { forRule: TemplateRule }) {
    this.templateRule = args.forRule;
  }

  public makeFileDestinationForAssetWithUrl(url: string): string {
    const subfolderName = this.getSubfolderNameForUrl(url);
    const filename = this.genUniqueBasename(url);
    const parentFolder = MediaDestinationController.getAbsoluteDestinationPath(
      this.templateRule.outDir,
      this.templateRule.writeMediaTo,
      subfolderName,
    );

    if (!FileSystemService.instance.doesFolderExist(parentFolder))
      FileSystemService.instance.createFolder(parentFolder);

    return `${subfolderName}/${filename}`;
  }

  public static getAbsoluteDestinationPath(
    outDir: string,
    writeMediaTo: string | undefined,
    subfolderName: string,
  ): string {
    return Boolean(writeMediaTo) ? `${writeMediaTo}/${subfolderName}` : `${outDir}/${subfolderName}`;
  }

  private getSubfolderNameForUrl(url: string): string {
    const fileExtension = pathUtils.extname(new urlUtils.URL(url).pathname);
    for (const [folderName, acceptedExtensions] of Object.entries(mediaTypes)) {
      const acceptsExtension = acceptedExtensions.indexOf(fileExtension) >= 0;
      if (acceptsExtension) return folderName;
    }

    return 'other_media';
  }

  private genUniqueBasename(url: string) {
    const basename = this.getUrlBasename(url);
    const fileExtensionStartIndex = basename.lastIndexOf('.');
    const uniqueName = FileNameService.instance.genUnique();

    if (fileExtensionStartIndex < 0) {
      return uniqueName;
    } else {
      return `${uniqueName}${basename.substring(fileExtensionStartIndex)}`;
    }
  }

  private getUrlBasename(url: string): string {
    return pathUtils.basename(new urlUtils.URL(url).pathname);
  }
}
