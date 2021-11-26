import * as pathUtils from 'path';
import * as urlUtils from 'url';
import * as request from 'request';
import * as fs from 'fs';

import { TemplateRule } from '../models/config_models';
import mediaTypes from '../constants/media_types';
import FileSystemService from './file_system_service';

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

    const relativeDestintation = destinationController.makeFileDestinationForAssetWithUrl(url);
    this.requests.set(url, {
      relativePath: relativeDestintation,
      absolutePath: `${templateRule.outDir}/${relativeDestintation}`,
    });

    return relativeDestintation;
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
    const filename = this.getUrlBasename(url);
    const parentFolder = `${this.templateRule.outDir}/${subfolderName}`;

    if (!FileSystemService.instance.doesFolderExist(parentFolder))
      FileSystemService.instance.createFolder(parentFolder);

    return `${subfolderName}/${filename}`;
  }

  private getSubfolderNameForUrl(url: string): string {
    const fileExtension = pathUtils.extname(new urlUtils.URL(url).pathname);
    for (const [folderName, acceptedExtensions] of Object.entries(mediaTypes)) {
      const acceptsExtension = acceptedExtensions.indexOf(fileExtension) >= 0;
      if (acceptsExtension) return folderName;
    }

    return 'other_media';
  }

  private getUrlBasename(url: string): string {
    return pathUtils.basename(new urlUtils.URL(url).pathname);
  }
}
