import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionPage, TemplateRule } from '../models/config_models';
import { EquationObject, FileObject, MentionObject, TextObject } from '../models/notion_objects';
import MediaService from './media_service';

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

function transformAllObjectsWithPrefix(
  objects: Array<TextObject | MentionObject | EquationObject>,
  prefix: string,
): string {
  return `${prefix}${ObjectTransformers.transform_all(objects)}`;
}

/**
 * @visibleForTesting
 */
export function getMedia(object: FileObject, rule: TemplateRule): { src: string; captionMarkdown: string } {
  const captionMd = transformAllObjectsWithPrefix(object.caption, '');
  let source = '';

  if (object.type === 'external') {
    source = object.external.url;
  } else {
    source = MediaService.instance.stageFetchRequest(object.file.url, rule);
  }

  return {
    src: source,
    captionMarkdown: captionMd,
  };
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

  transform_all: (objects: Array<TextObject | MentionObject | EquationObject>): string => {
    return objects.map((object) => ObjectTransformers[object.type](object as any)).join('');
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
    return transformAllObjectsWithPrefix((block as any).paragraph.text, '');
  },

  heading_1: (block: GetBlockResponse): string => {
    return transformAllObjectsWithPrefix((block as any).heading_1.text, '# ');
  },

  heading_2: (block: GetBlockResponse): string => {
    return transformAllObjectsWithPrefix((block as any).heading_2.text, '## ');
  },

  heading_3: (block: GetBlockResponse): string => {
    return transformAllObjectsWithPrefix((block as any).heading_3.text, '### ');
  },

  bulleted_list_item: (block: GetBlockResponse): string => {
    return transformAllObjectsWithPrefix((block as any).bulleted_list_item.text, '- ');
  },

  numbered_list_item: (block: GetBlockResponse, index: number): string => {
    return transformAllObjectsWithPrefix((block as any).numbered_list_item.text, `${index}. `);
  },

  to_do: (block: GetBlockResponse): string => {
    const check = (block as any).to_do.checked ? 'X' : ' ';
    return transformAllObjectsWithPrefix((block as any).to_do.text, `- [${check}] `);
  },

  toggle: (block: GetBlockResponse): string => {
    return transformAllObjectsWithPrefix((block as any).toggle.text, '');
  },

  child_page: (block: GetBlockResponse): string => {
    const id = block.id.split('-').join('');
    return `[${(block as any).child_page.title}](https://www.notion.so/${id})`;
  },

  child_database: (block: GetBlockResponse): string => {
    const id = block.id.split('-').join('');
    return `[${(block as any).child_database.title}](https://www.notion.so/${id})`;
  },

  embed: (block: GetBlockResponse): string => {
    const caption = transformAllObjectsWithPrefix((block as any).embed.caption, '');
    return `[${caption}](${(block as any).embed.url} ':include')`;
  },

  image: (block: GetBlockResponse, rule: TemplateRule): string => {
    const media = getMedia((block as any).image, rule);
    return `![${media.captionMarkdown}](${media.src} "${media.captionMarkdown}")`;
  },

  video: (block: GetBlockResponse, rule: TemplateRule): string => {
    const media = getMedia((block as any).video, rule);
    return `[${media.captionMarkdown}](${media.src} ':include')`;
  },

  file: (block: GetBlockResponse, rule: TemplateRule): string => {
    const media = getMedia((block as any).file, rule);
    return `[${media.captionMarkdown}](${media.src} ':include')`;
  },

  pdf: (block: GetBlockResponse, rule: TemplateRule): string => {
    const media = getMedia((block as any).pdf, rule);
    return `[${media.captionMarkdown}](${media.src} ':include')`;
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
