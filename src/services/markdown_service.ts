import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionBlock, TemplateRule } from '../models/config_models';
import { EquationObject, FileObject, MentionObject, TextObject } from '../models/notion_objects';
import MediaService from './media_service';

export function applyAnnotations(
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
  if (annotations.italic) out = `*${out}*`;
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
    let out = `$${object.equation.expression}$`;
    if (object.href) out = `[${out}](${object.href})`;

    return applyAnnotations(out, object.annotations);
  },

  transform_all: (objects: Array<TextObject | MentionObject | EquationObject>): string => {
    return objects?.map((object) => ObjectTransformers[object.type](object as any)).join('') ?? '';
  },
};

declare type BlockTransformerType = (block: GetBlockResponse, rule: TemplateRule) => string;

/**
 * The block transformers.
 *
 * The keys are the block types and the value is the NotionBlock to
 * Markdown controller for the block.
 *
 * These can be overwritten to provide custom implementations.
 */
export const BlockTransformers: Record<string, BlockTransformerType> = {
  paragraph: (block: GetBlockResponse): string => {
    if (block.type === 'paragraph') {
      return transformAllObjectsWithPrefix(block.paragraph.text, '');
    }

    return '';
  },

  heading_1: (block: GetBlockResponse): string => {
    if (block.type === 'heading_1') {
      return transformAllObjectsWithPrefix(block.heading_1.text, '# ');
    }

    return '';
  },

  heading_2: (block: GetBlockResponse): string => {
    if (block.type === 'heading_2') {
      return transformAllObjectsWithPrefix(block.heading_2.text, '## ');
    }

    return '';
  },

  heading_3: (block: GetBlockResponse): string => {
    if (block.type === 'heading_3') {
      return transformAllObjectsWithPrefix(block.heading_3.text, '### ');
    }

    return '';
  },

  bulleted_list_item: (block: GetBlockResponse): string => {
    if (block.type === 'bulleted_list_item') {
      return transformAllObjectsWithPrefix(block.bulleted_list_item.text, '- ');
    }

    return '';
  },

  numbered_list_item: (block: GetBlockResponse, _): string => {
    if (block.type === 'numbered_list_item') {
      return transformAllObjectsWithPrefix(block.numbered_list_item.text, `1. `);
    }

    return '';
  },

  to_do: (block: GetBlockResponse): string => {
    if (block.type === 'to_do') {
      const check = block.to_do.checked ? 'X' : ' ';
      return transformAllObjectsWithPrefix(block.to_do.text, `- [${check}] `);
    }

    return '';
  },

  toggle: (block: GetBlockResponse): string => {
    if (block.type === 'toggle') {
      return transformAllObjectsWithPrefix(block.toggle.text, '');
    }

    return '';
  },

  child_page: (block: GetBlockResponse): string => {
    if (block.type === 'child_page') {
      const id = block.id.split('-').join('');
      return `[${block.child_page.title}](https://www.notion.so/${id})`;
    }

    return '';
  },

  child_database: (block: GetBlockResponse): string => {
    if (block.type === 'child_database') {
      const id = block.id.split('-').join('');
      return `[${block.child_database.title}](https://www.notion.so/${id})`;
    }

    return '';
  },

  embed: (block: GetBlockResponse): string => {
    if (block.type === 'embed') {
      const caption = transformAllObjectsWithPrefix(block.embed.caption, '');
      return `[${caption}](${block.embed.url} ':include')`;
    }

    return '';
  },

  image: (block: GetBlockResponse, rule: TemplateRule): string => {
    if (block.type === 'image') {
      const media = getMedia(block.image, rule);
      return `![${media.captionMarkdown}](${media.src} "${media.captionMarkdown}")`;
    }

    return '';
  },

  video: (block: GetBlockResponse, rule: TemplateRule): string => {
    if (block.type === 'video') {
      const media = getMedia(block.video, rule);
      return `[${media.captionMarkdown}](${media.src} ':include')`;
    }

    return '';
  },

  file: (block: GetBlockResponse, rule: TemplateRule): string => {
    if (block.type === 'file') {
      const media = getMedia(block.file, rule);
      return `[${media.captionMarkdown}](${media.src} ':include')`;
    }

    return '';
  },

  pdf: (block: GetBlockResponse, rule: TemplateRule): string => {
    if (block.type === 'pdf') {
      const media = getMedia(block.pdf, rule);
      return `[${media.captionMarkdown}](${media.src} ':include')`;
    }

    return '';
  },

  audio: (block: GetBlockResponse, rule: TemplateRule): string => {
    if (block.type === 'audio') {
      const media = getMedia(block.audio, rule);
      return `[${media.captionMarkdown}](${media.src} ':include')`;
    }

    return '';
  },

  bookmark: (block: GetBlockResponse): string => {
    if (block.type === 'bookmark') {
      const url = block.bookmark.url;
      return `[${url}](${url})`;
    }

    return '';
  },

  callout: (block: GetBlockResponse): string => {
    if (block.type === 'callout') {
      const text = transformAllObjectsWithPrefix(block.callout.text, '');
      if (block.callout.icon?.type === 'emoji') {
        const icon = block.callout.icon.emoji;
        return `> ${icon} ${text}`;
      }

      return `> ${text}`;
    }

    return '';
  },

  quote: (block: GetBlockResponse): string => {
    if (block.type === 'quote') {
      const text = transformAllObjectsWithPrefix(block.quote.text, '');
      return `> ${text}`;
    }

    return '';
  },

  equation: (block: GetBlockResponse): string => {
    if (block.type === 'equation') {
      const expression = block.equation.expression;
      return `$$${expression}$$`;
    }

    return '';
  },

  divider: (block: GetBlockResponse): string => {
    return '---';
  },

  table_of_contents: (block: GetBlockResponse): string => {
    return '';
  },

  breadcrumb: (block: GetBlockResponse): string => {
    return '';
  },

  code: (block: GetBlockResponse): string => {
    if (block.type === 'code') {
      const text = transformAllObjectsWithPrefix(block.code.text, '');
      return '```' + block.code.language + '\n' + text + '\n```';
    }
    return '';
  },

  unsupported: (block: GetBlockResponse): string => {
    return 'Unsupported';
  },
};

export default class MarkdownService {
  public genMarkdownForBlocks(blocks: NotionBlock[], rule: TemplateRule): string {
    return this.genMarkdownForBlocksWithIndent(blocks, rule, '');
  }

  public genMarkdownForBlocksWithIndent(blocks: NotionBlock[], rule: TemplateRule, indent: string): string {
    let out = '';

    for (const block of blocks) {
      const transformer = this.getTransformerForBlock(block);
      const markdown = this.getMarkdownForBlock(block, rule, transformer);

      if (out.length === 0) {
        out = `${indent}${markdown}\n`;
      } else {
        out = `${out}\n${indent}${markdown}\n`;
      }

      const childrenMarkdown = this.genMarkdownForBlocksWithIndent(block.children, rule, `${indent}    `).trimEnd();
      if (childrenMarkdown.length !== 0) {
        out = `${out}\n${childrenMarkdown}\n`;
      }
    }

    return out;
  }

  private getTransformerForBlock(block: NotionBlock): BlockTransformerType | undefined {
    for (const blockType of Object.keys(BlockTransformers)) {
      if (blockType === block.data.type) {
        return BlockTransformers[blockType];
      }
    }

    return undefined;
  }

  private getMarkdownForBlock(
    block: NotionBlock,
    rule: TemplateRule,
    transformer: BlockTransformerType | undefined,
  ): string {
    if (transformer) {
      return transformer(block.data, rule);
    } else {
      return `Unknown Block: ${block.data.type}`;
    }
  }

  private static _instance: MarkdownService;
  public static get instance(): MarkdownService {
    return this._instance ?? (this._instance = new MarkdownService());
  }

  public static setMockedInstance(instance: MarkdownService) {
    this._instance = instance;
  }
}
