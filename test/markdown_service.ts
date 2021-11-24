import { describe, it } from 'mocha';
import { expect } from 'chai';
import { ObjectTransformers } from '../src/services/markdown_service';
import { TextObject, TextRequest } from '../src/models/notion_objects';

describe('ObjectTransformers tests', () => {
  describe('text', () => {
    describe("When content is 'abc' and all annotations are off", () => {
      function makeTextObjectWithLink(
        link: {
          url: TextRequest;
        } | null,
      ): TextObject {
        return {
          type: 'text',
          text: {
            content: 'abc',
            link: link,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'abc',
          href: link?.url ?? null,
        };
      }

      it("Should return 'abc' when link is null", () => {
        const object = makeTextObjectWithLink(null);
        expect(ObjectTransformers.text(object)).to.equal('abc');
      });

      it("Should return '[abc](http://example.com)' link.url is 'http://example.com'", () => {
        const object = makeTextObjectWithLink({
          url: 'http://example.com',
        });
        expect(ObjectTransformers.text(object)).to.equal('[abc](http://example.com)');
      });
    });

    describe("When content is 'abc' and link is null", () => {
      function makeTextObjectWithAnnotations(annotations: {
        bold: boolean;
        italic: boolean;
        strikethrough: boolean;
        underline: boolean;
        code: boolean;
        color: 'default';
      }): TextObject {
        return {
          type: 'text',
          text: {
            content: 'abc',
            link: null,
          },
          annotations: annotations,
          plain_text: 'abc',
          href: null,
        };
      }

      it("Should return '**abc**' when only the bold annotation is true", () => {
        const object = makeTextObjectWithAnnotations({
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        });

        expect(ObjectTransformers.text(object)).to.equal('**abc**');
      });

      it("Should return '__abc__' when only the italic annotation is true", () => {
        const object = makeTextObjectWithAnnotations({
          bold: false,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        });

        expect(ObjectTransformers.text(object)).to.equal('__abc__');
      });

      it("Should return '~~abc~~' when only the strikethrough annotation is true", () => {
        const object = makeTextObjectWithAnnotations({
          bold: false,
          italic: false,
          strikethrough: true,
          underline: false,
          code: false,
          color: 'default',
        });

        expect(ObjectTransformers.text(object)).to.equal('~~abc~~');
      });

      it("Should return '`abc`' when only the code annotation is true", () => {
        const object = makeTextObjectWithAnnotations({
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: true,
          color: 'default',
        });

        expect(ObjectTransformers.text(object)).to.equal('`abc`');
      });

      it("Should return '**__~~`abc`~~__**' when bold, italic, strikethrough, and code annotations are true", () => {
        const object = makeTextObjectWithAnnotations({
          bold: true,
          italic: true,
          strikethrough: true,
          underline: false,
          code: true,
          color: 'default',
        });

        expect(ObjectTransformers.text(object)).to.equal('**__~~`abc`~~__**');
      });
    });

    describe("When content is 'abc' and link.url is 'http://example.com'", () => {
      it("Should return '**[abc](http://example.com)**' when only the bold annotation is true", () => {
        const object: TextObject = {
          type: 'text',
          text: {
            content: 'abc',
            link: {
              url: 'http://example.com',
            },
          },
          annotations: {
            bold: true,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'abc',
          href: 'http://example.com',
        };

        expect(ObjectTransformers.text(object)).to.equal('**[abc](http://example.com)**');
      });
    });
  });
});
