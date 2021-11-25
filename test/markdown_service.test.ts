import { describe, it } from 'mocha';
import { expect } from 'chai';
import { BlockTransformers, getMedia, ObjectTransformers } from '../src/services/markdown_service';
import {
  DatabaseMentionObject,
  DateObject,
  EquationObject,
  FileObject,
  MentionObject,
  PageMentionObject,
  TextObject,
  TextRequest,
  UserObject,
} from '../src/models/notion_objects';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { setMockedMediaService } from './mocking_utils';

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

  describe('mention', () => {
    describe('When all annotations are off', () => {
      function makeMentionObjectForDate(date: DateObject, href: string | null): MentionObject {
        return {
          type: 'mention',
          mention: date,
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: '@today',
          href: href,
        };
      }

      function makeMentionObjectForUser(user: UserObject, plainText: string, href: string | null): MentionObject {
        return {
          type: 'mention',
          mention: user,
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: plainText,
          href: href,
        };
      }

      describe('When mention.href is null', () => {
        describe("When mention.type is 'user'", () => {
          describe('When the user is anonymous (i.e only the id and object fields are given)', () => {
            it("Should return '@hello' when mention.plain_text is @hello", () => {
              const object = makeMentionObjectForUser(
                {
                  type: 'user',
                  user: {
                    id: '',
                    object: 'user',
                  },
                },
                '@hello',
                null,
              );

              expect(ObjectTransformers.mention(object)).to.equal('@hello');
            });
          });

          describe('When the user is a person', () => {
            it("Should return 'abc' when person name is 'abc'", () => {
              const object = makeMentionObjectForUser(
                {
                  type: 'user',
                  user: {
                    type: 'person',
                    person: {
                      email: 'abc@c.com',
                    },
                    name: 'abc',
                    avatar_url: 'example.com',
                    id: 'xxxr',
                    object: 'user',
                  },
                },
                '',
                null,
              );

              expect(ObjectTransformers.mention(object)).to.equal('abc');
            });
          });

          describe('When the user is a bot', () => {
            it("Should return 'efg' when bot name is 'efg'", () => {
              const object = makeMentionObjectForUser(
                {
                  type: 'user',
                  user: {
                    type: 'bot',
                    name: 'efg',
                    avatar_url: 'example.com',
                    id: 'xxxr',
                    object: 'user',
                  },
                },
                '',
                null,
              );

              expect(ObjectTransformers.mention(object)).to.equal('efg');
            });
          });
        });

        describe("When mention.type is 'date'", () => {
          describe("When the start field is '2020-12-08T12:00:00Z'", () => {
            it("Should return '2020-12-08T12:00:00Z' when the end field is null", () => {
              const object = makeMentionObjectForDate(
                {
                  type: 'date',
                  date: {
                    start: '2020-12-08T12:00:00Z',
                    end: null,
                  },
                },
                null,
              );

              expect(ObjectTransformers.mention(object)).to.equal('2020-12-08T12:00:00Z');
            });

            it("Should return '2020-12-08T12:00:00Z to '2022-12-08T12:00:00Z' when the end field is '2022-12-08T12:00:00Z'", () => {
              const object = makeMentionObjectForDate(
                {
                  type: 'date',
                  date: {
                    start: '2020-12-08T12:00:00Z',
                    end: '2022-12-08T12:00:00Z',
                  },
                },
                null,
              );

              expect(ObjectTransformers.mention(object)).to.equal('2020-12-08T12:00:00Z to 2022-12-08T12:00:00Z');
            });
          });
        });
      });

      describe('When mention.href is NOT null', () => {
        describe("When mention.type is 'user'", () => {
          describe('When the user is a bot', () => {
            it("Should return '[efg](example.com)' when bot name is 'efg' and href is 'example.com'", () => {
              const object = makeMentionObjectForUser(
                {
                  type: 'user',
                  user: {
                    type: 'bot',
                    name: 'efg',
                    avatar_url: 'example.com',
                    id: 'xxxr',
                    object: 'user',
                  },
                },
                '',
                'example.com',
              );

              expect(ObjectTransformers.mention(object)).to.equal('[efg](example.com)');
            });
          });
        });

        describe("When mention.type is 'date'", () => {
          describe("When the start field is '2020-12-08T12:00:00Z'", () => {
            it("Should return '[2020-12-08T12:00:00Z](example.com)' when the end field is null and href is 'example.com'", () => {
              const object = makeMentionObjectForDate(
                {
                  type: 'date',
                  date: {
                    start: '2020-12-08T12:00:00Z',
                    end: null,
                  },
                },
                'example.com',
              );

              expect(ObjectTransformers.mention(object)).to.equal('[2020-12-08T12:00:00Z](example.com)');
            });
          });
        });

        describe("When mention.type is 'page'", () => {
          function makeMentionObjectForPage(page: PageMentionObject, plainText: string): MentionObject {
            return {
              type: 'mention',
              mention: page,
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default',
              },
              plain_text: plainText,
              href: 'rrr',
            };
          }

          it("Should return [dub](:::pathTo:::abc-def:::) when linked to page with id 'abc-def' and plain_text is 'dub'", () => {
            const object = makeMentionObjectForPage(
              {
                type: 'page',
                page: {
                  id: 'abc-def',
                },
              },
              'dub',
            );

            expect(ObjectTransformers.mention(object)).to.equal('[dub](:::pathTo:::abc-def:::)');
          });
        });

        describe("When mention.type is 'database'", () => {
          function makeMentionObjectForDatabase(
            database: DatabaseMentionObject,
            plainText: string,
            href: string,
          ): MentionObject {
            return {
              type: 'mention',
              mention: database,
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default',
              },
              plain_text: plainText,
              href: href,
            };
          }

          it("Should return [abc](efg) when plain_text is 'abc' and href is 'efg'", () => {
            const object = makeMentionObjectForDatabase(
              {
                type: 'database',
                database: {
                  id: 'fff',
                },
              },
              'abc',
              'efg',
            );

            expect(ObjectTransformers.mention(object)).to.equal('[abc](efg)');
          });
        });
      });
    });

    describe("When mention.type is 'date' ", () => {
      describe("When the start field is '2020-12-08T12:00:00Z', the end field is null, and the href is 'example.com'", () => {
        function makeMentionObjectForDateWithAnnotations(annotations: {
          bold: boolean;
          italic: boolean;
          strikethrough: boolean;
          underline: boolean;
          code: boolean;
          color: 'default';
        }): MentionObject {
          return {
            type: 'mention',
            mention: {
              type: 'date',
              date: {
                start: '2020-12-08T12:00:00Z',
                end: null,
              },
            },
            annotations: annotations,
            plain_text: '@today',
            href: 'example.com',
          };
        }

        it("Should return '**[2020-12-08T12:00:00Z](example.com)**' when only the bold annotation is true", () => {
          const object = makeMentionObjectForDateWithAnnotations({
            bold: true,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          });

          expect(ObjectTransformers.mention(object)).to.equal('**[2020-12-08T12:00:00Z](example.com)**');
        });

        it("Should return '__[2020-12-08T12:00:00Z](example.com)__' when only the italic annotation is true", () => {
          const object = makeMentionObjectForDateWithAnnotations({
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          });

          expect(ObjectTransformers.mention(object)).to.equal('__[2020-12-08T12:00:00Z](example.com)__');
        });

        it("Should return '~~[2020-12-08T12:00:00Z](example.com)~~' when only the strikethrough annotation is true", () => {
          const object = makeMentionObjectForDateWithAnnotations({
            bold: false,
            italic: false,
            strikethrough: true,
            underline: false,
            code: false,
            color: 'default',
          });

          expect(ObjectTransformers.mention(object)).to.equal('~~[2020-12-08T12:00:00Z](example.com)~~');
        });

        it("Should return '`[2020-12-08T12:00:00Z](example.com)`' when only the code annotation is true", () => {
          const object = makeMentionObjectForDateWithAnnotations({
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: true,
            color: 'default',
          });

          expect(ObjectTransformers.mention(object)).to.equal('`[2020-12-08T12:00:00Z](example.com)`');
        });

        it("Should return '**__~~`[2020-12-08T12:00:00Z](example.com)`~~__**' when the bold, italic, strikethrough and code annotations are true", () => {
          const object = makeMentionObjectForDateWithAnnotations({
            bold: true,
            italic: true,
            strikethrough: true,
            underline: false,
            code: true,
            color: 'default',
          });

          expect(ObjectTransformers.mention(object)).to.equal('**__~~`[2020-12-08T12:00:00Z](example.com)`~~__**');
        });
      });
    });
  });

  describe('equation', () => {
    describe('When all annotations are off', () => {
      describe('When href is null', () => {
        function makeEquationObject(expression: string): EquationObject {
          return {
            type: 'equation',
            equation: {
              expression: expression,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: 'default',
            },
            plain_text: expression,
            href: null,
          };
        }

        it("Should return '\\(abc\\)' when expression is 'abc'", () => {
          const object = makeEquationObject('abc');
          expect(ObjectTransformers.equation(object)).to.equal('\\(abc\\)');
        });
      });

      describe("When href is 'example.com'", () => {
        function makeEquationObject(expression: string, href: 'example.com'): EquationObject {
          return {
            type: 'equation',
            equation: {
              expression: expression,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: 'default',
            },
            plain_text: expression,
            href: href,
          };
        }

        it("Should return '[\\(abc\\)](example.com)' when expression is 'abc'", () => {
          const object = makeEquationObject('abc', 'example.com');
          expect(ObjectTransformers.equation(object)).to.equal('[\\(abc\\)](example.com)');
        });
      });
    });

    describe("When href is 'example.com'", () => {
      function makeEquationObjectWithAnnotations(
        annotations: {
          bold: boolean;
          italic: boolean;
          strikethrough: boolean;
          underline: boolean;
          code: boolean;
          color: 'default';
        },
        expression: string,
      ): EquationObject {
        return {
          type: 'equation',
          equation: {
            expression: expression,
          },
          annotations: annotations,
          plain_text: expression,
          href: 'example.com',
        };
      }

      it("Should return '**[\\(abc\\)](example.com)**' when only the bold annotation is true", () => {
        const object = makeEquationObjectWithAnnotations(
          {
            bold: true,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          'abc',
        );

        expect(ObjectTransformers.equation(object)).to.equal('**[\\(abc\\)](example.com)**');
      });

      it("Should return '__[\\(abc\\)](example.com)__' when only the italic annotation is true", () => {
        const object = makeEquationObjectWithAnnotations(
          {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          'abc',
        );

        expect(ObjectTransformers.equation(object)).to.equal('__[\\(abc\\)](example.com)__');
      });

      it("Should return '~~[\\(abc\\)](example.com)~~' when only the strikethrough annotation is true", () => {
        const object = makeEquationObjectWithAnnotations(
          {
            bold: false,
            italic: false,
            strikethrough: true,
            underline: false,
            code: false,
            color: 'default',
          },
          'abc',
        );

        expect(ObjectTransformers.equation(object)).to.equal('~~[\\(abc\\)](example.com)~~');
      });

      it("Should return '`[\\(abc\\)](example.com)`' when only the code annotation is true", () => {
        const object = makeEquationObjectWithAnnotations(
          {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: true,
            color: 'default',
          },
          'abc',
        );

        expect(ObjectTransformers.equation(object)).to.equal('`[\\(abc\\)](example.com)`');
      });

      it("Should return '**__~~`[\\(abc\\)](example.com)`~~__**' when the bold, italic, strikethrough, and code annotations are true", () => {
        const object = makeEquationObjectWithAnnotations(
          {
            bold: true,
            italic: true,
            strikethrough: true,
            underline: false,
            code: true,
            color: 'default',
          },
          'abc',
        );

        expect(ObjectTransformers.equation(object)).to.equal('**__~~`[\\(abc\\)](example.com)`~~__**');
      });
    });
  });

  describe('transform_all', () => {
    it('Should transform allobjects with the text, mention, and equation ObjectTransfromers and merge their outputs', () => {
      ObjectTransformers.text = (_) => 'text object, ';
      ObjectTransformers.mention = (_) => 'mention object, ';
      ObjectTransformers.equation = (_) => 'equation object';

      const objects = [
        {
          type: 'text',
        },
        {
          type: 'mention',
        },
        {
          type: 'equation',
        },
      ] as any[];

      expect(ObjectTransformers.transform_all(objects)).to.equal('text object, mention object, equation object');
    });
  });
});

describe('BlockTransformers tests', () => {
  describe('paragraph', () => {
    it("Should return 'abc' when ObjectTransformers.transform_all returns 'abc'", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'paragraph',
        paragraph: {
          text: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.paragraph(block)).to.equal('abc');
    });
  });

  describe('heading_1', () => {
    it("Should return '# abc' when ObjectTransformers.transform_all returns 'abc'", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'heading_1',
        heading_1: {
          text: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.heading_1(block)).to.equal('# abc');
    });
  });

  describe('heading_2', () => {
    it("Should return '## abc' when ObjectTransformers.transform_all returns 'abc'", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'heading_2',
        heading_2: {
          text: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.heading_2(block)).to.equal('## abc');
    });
  });

  describe('heading_3', () => {
    it("Should return '### abc' when ObjectTransformers.transform_all returns 'abc'", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'heading_3',
        heading_3: {
          text: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.heading_3(block)).to.equal('### abc');
    });
  });

  describe('bulleted_list_item', () => {
    it("Should return '- abc' when ObjectTransformers.transform_all returns 'abc'", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          text: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.bulleted_list_item(block)).to.equal('- abc');
    });
  });

  describe('numbered_list_item', () => {
    it("Should return '2. abc' when ObjectTransformers.transform_all returns 'abc' and index is 2", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'numbered_list_item',
        numbered_list_item: {
          text: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.numbered_list_item(block, 2)).to.equal('2. abc');
    });
  });

  describe('to_do', () => {
    it("Should return '- [ ] abc' when ObjectTransformers.transform_all returns 'abc' and checked is false", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'to_do',
        to_do: {
          text: [],
          checked: false,
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.to_do(block)).to.equal('- [ ] abc');
    });

    it("Should return '- [X] abc' when ObjectTransformers.transform_all returns 'abc' and checked is true", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'to_do',
        to_do: {
          text: [],
          checked: true,
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.to_do(block)).to.equal('- [X] abc');
    });
  });

  describe('toggle', () => {
    it("Should return 'abc' when ObjectTransformers.transform_all returns 'abc'", () => {
      const block: GetBlockResponse = {
        type: 'toggle',
        toggle: {
          text: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.toggle(block)).to.equal('abc');
    });
  });

  describe('child_page', () => {
    it("Should return '[abc](https://www.notion.so/efghijklm)' when page title is 'abc' and id is 'efg-hij-klm'", () => {
      const block: GetBlockResponse = {
        type: 'child_page',
        child_page: {
          title: 'abc',
        },
        object: 'block',
        id: 'efg-hij-klm',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.child_page(block)).to.equal('[abc](https://www.notion.so/efghijklm)');
    });
  });

  describe('child_database', () => {
    it("Should return '[abc](https://www.notion.so/efghijklm)' when database title is 'abc' and id is 'efg-hij-klm'", () => {
      const block: GetBlockResponse = {
        type: 'child_database',
        child_database: {
          title: 'abc',
        },
        object: 'block',
        id: 'efg-hij-klm',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.child_database(block)).to.equal('[abc](https://www.notion.so/efghijklm)');
    });
  });

  describe('embed', () => {
    it("Should return \"[abc](example.com ':include')\" when ObjectTransformers.transform_all returns 'abc' for caption and embed url is 'example.com'", () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'embed',
        embed: {
          url: 'example.com',
          caption: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.embed(block)).to.equal("[abc](example.com ':include')");
    });
  });

  describe('image', () => {
    it('Should return ![abc](example.com "abc") when getMedia returns src=example.com and captionMarkdown=abc', () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'image',
        image: {
          type: 'external',
          external: {
            url: 'example.com',
          },
          caption: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.image(block, {} as any)).to.equal('![abc](example.com "abc")');
    });
  });

  describe('video', () => {
    it('Should return "[abc](example.com \':include\')" when getMedia returns src=example.com and captionMarkdown=abc', () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'video',
        video: {
          type: 'external',
          external: {
            url: 'example.com',
          },
          caption: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.video(block, {} as any)).to.equal("[abc](example.com ':include')");
    });
  });

  describe('file', () => {
    it('Should return "[abc](example.com \':include\')" when getMedia returns src=example.com and captionMarkdown=abc', () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'file',
        file: {
          type: 'external',
          external: {
            url: 'example.com',
          },
          caption: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.file(block, {} as any)).to.equal("[abc](example.com ':include')");
    });
  });

  describe('pdf', () => {
    it('Should return "[abc](example.com \':include\')" when getMedia returns src=example.com and captionMarkdown=abc', () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const block: GetBlockResponse = {
        type: 'pdf',
        pdf: {
          type: 'external',
          external: {
            url: 'example.com',
          },
          caption: [],
        },
        object: 'block',
        id: '',
        created_time: '',
        last_edited_time: '',
        has_children: false,
        archived: false,
      };

      expect(BlockTransformers.pdf(block, {} as any)).to.equal("[abc](example.com ':include')");
    });
  });
});

describe('getMedia tests', () => {
  describe("When type is 'external'", () => {
    it('Should return src=file url and captionMarkdown=the value returned by ObjectTransformers.transform_all for file caption', () => {
      ObjectTransformers.transform_all = (_) => 'abc';

      const object: FileObject = {
        type: 'external',
        external: {
          url: 'example.com',
        },
        caption: [],
      };

      expect(getMedia(object, {} as any)).to.deep.equal({
        src: 'example.com',
        captionMarkdown: 'abc',
      });
    });
  });

  describe("When type is 'file'", () => {
    it('Should return src=file path as returned by MediaService.fetchMedia and captionMarkdown=the value returned by ObjectTransformers.transform_all for file caption', () => {
      ObjectTransformers.transform_all = (_) => 'abc';
      setMockedMediaService({
        stageFetchRequest: (url, _) => `${url} abc`,
      });

      const object: FileObject = {
        type: 'file',
        file: {
          url: 'example.com',
          expiry_time: '',
        },
        caption: [],
      };

      expect(getMedia(object, {} as any)).to.deep.equal({
        src: 'example.com abc',
        captionMarkdown: 'abc',
      });
    });
  });
});
