import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionPage } from '../models/config_models';
import { EquationObject, MentionObject, TextObject } from '../models/notion_objects';

function applyAnnotations(
  text: string,
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    code: boolean;
  },
): string {
  let out = text;

  if (annotations.code) out = `\`${out}\``;
  if (annotations.strikethrough) out = `~~${out}~~`;
  if (annotations.italic) out = `__${out}__`;
  if (annotations.bold) out = `**${out}**`;

  return out;
}

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
    let out = object.text.content;
    if (object.text.link) out = `[${out}](${object.text.link.url})`;

    return applyAnnotations(out, object.annotations);
  },

  mention: (object: MentionObject): string => {
    let out = '';

    if (object.mention.type === 'user') {
      const user = object.mention.user;
      if ((user as any).type === 'person' || (user as any).type === 'bot') {
        out = (user as any).name;
      } else {
        out = object.plain_text;
      }

      if (object.href) out = `[${out}](${object.href})`;
    } else if (object.mention.type === 'date') {
      const date = object.mention.date;
      if (date.end != null) out = `${date.start} to ${date.end}`;
      else out = date.start;

      if (object.href) out = `[${out}](${object.href})`;
    } else if (object.mention.type === 'page') {
      const page = object.mention.page;
      out = `[${object.plain_text}](:::pathTo:::${page.id}:::)`;
    } else if (object.mention.type === 'database') {
      out = `[${object.plain_text}](${object.href})`;
    }

    return applyAnnotations(out, object.annotations);
  },

  equation: (object: EquationObject): string => {
    let out = `\\(${object.equation.expression}\\)`;
    if (object.href) out = `[${out}](${object.href})`;

    return applyAnnotations(out, object.annotations);
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
    const listOfObjects: Array<TextObject | MentionObject | EquationObject> = (block as any).paragraph.text;
    return listOfObjects.map((object) => ObjectTransformers[object.type](object as any)).join('');
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
