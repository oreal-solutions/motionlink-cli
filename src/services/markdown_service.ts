import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionPage } from '../models/config_models';
import { TextObject } from '../models/notion_objects';

/**
 * The object transformers.
 *
 * The keys are the object types and the value is the object type to
 * Markdown transformer.
 *
 * These can be overwritten to provide custom implementations.
 *
 * See all object types here: src/models/notion_objects.ts
 */
export const ObjectTransformers = {
  text: (object: TextObject): string => {
    let out = '';
    if (object.text.link == null) out = object.text.content;
    else out = `[${object.text.content}](${object.text.link.url})`;

    if (object.annotations.code) out = `\`${out}\``;
    if (object.annotations.strikethrough) out = `~~${out}~~`;
    if (object.annotations.italic) out = `__${out}__`;
    if (object.annotations.bold) out = `**${out}**`;

    return out;
  },
};

/**
 * The block transformers.
 *
 * The keys are the block types and the value is the NotionBlock to
 * Markdown controller for the block.
 *
 * These can be overwritten to provide custom implementations.
 */
export const BlockTransformers = {
  paragraph: (block: GetBlockResponse): string => {
    return '';
  },
};

export default class MarkdownService {
  public genMarkdownForPage(page: NotionPage): string {
    // TODO: Implement
    // NB: implements indentation algorithm.
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
