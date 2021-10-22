import { describe, it, setup } from 'mocha';
import { expect } from 'chai';
import { Context, DatabaseRule, NotionBlock, NotionPage } from '../src/models/config_models';
import { NotionDatabaseAssociation, Token } from '../src/models/app_models';
import {
  BlockChildrenFetcher,
  CachingFileReader,
  DatabaseAssociationFinder,
  DatabaseFetcher,
  FileExtensionFinder,
  TemplateRuleOutputWriter,
} from '../src/services/build_service';
import {
  asMockedBlockChildrenFetcher,
  asMockedCachingFileReader,
  asMockedFileExtensionFinder,
  setMockedFileSystemService,
  setMockedMustacheService,
  setMockedNotionService,
} from './mocking_utils';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';

describe('BuildService tests', () => {});

describe('FileExtensionFinder tests', () => {
  describe('findFileExtensionOf(path)', () => {
    it("Should return '.md' when given 'abc.def.md'", () => {
      expect(new FileExtensionFinder().findFileExtensionOf('abc.def.md')).to.equal('.md');
    });

    it("Should return empty string when given 'abc'", () => {
      return expect(new FileExtensionFinder().findFileExtensionOf('abc')).to.be.empty;
    });
  });
});

describe('DatabaseAssociationFinder tests', () => {
  describe('findDatabaseAssociationFor(key, databaseAssociations)', () => {
    it('Should return the first found database association for the rule when it exists', () => {
      const rule: DatabaseRule = {
        database: 'abc',
      };

      const associations: NotionDatabaseAssociation[] = [
        {
          name: 'abc',
          notionDatabaseId: 'aaa',
          notionIntegrationToken: {
            token: 'ccc',
          },
        },
      ];

      expect(new DatabaseAssociationFinder().findDatabaseAssociationFor(rule, associations)).to.deep.equal({
        name: 'abc',
        notionDatabaseId: 'aaa',
        notionIntegrationToken: {
          token: 'ccc',
        },
      });
    });

    it("Should throw Error('The database association \"abc\" does not exist.') when the rule has 'abc' as its database but the database is not in the associations", () => {
      const rule: DatabaseRule = {
        database: 'abc',
      };

      let thrownError = new Error();
      try {
        new DatabaseAssociationFinder().findDatabaseAssociationFor(rule, []);
      } catch (e) {
        thrownError = e as any;
      }

      expect(thrownError.message).to.equal('The database association "abc" does not exist.');
    });
  });
});

describe('CachingFileReader', () => {
  describe('readAsString(path)', () => {
    it('Should return the same value returned by FileSystemService.readFileAsString on first call', () => {
      setMockedFileSystemService({
        readFileAsString: (_) => 'abc',
      });

      const instance = new CachingFileReader();
      expect(instance.readAsString('path')).to.equal('abc');
    });

    it('Should not call FileSystemService.readFileAsString on subsequent reads for the file, but return the cached contents instead', () => {
      let count = 0;
      setMockedFileSystemService({
        readFileAsString: (_) => {
          count++;
          return `${count}`;
        },
      });

      const instance = new CachingFileReader();

      // Call it a couple of times with the same path
      instance.readAsString('path');
      instance.readAsString('path');

      expect(instance.readAsString('path')).to.equal('1');
    });
  });
});

describe('TemplateRuleOutputWriter tests', () => {
  describe('write(page, pageTemplateRule)', () => {
    let instance: TemplateRuleOutputWriter;
    setup(() => {
      instance = new TemplateRuleOutputWriter();
      instance.setFileExtensionFinder(
        asMockedFileExtensionFinder({
          findFileExtensionOf: (_) => '.html',
        }),
      );
    });

    describe('Rendering', () => {
      setup(() => {
        instance.setCachingFileReader(
          asMockedCachingFileReader({
            readAsString: (path) => `contents of ${path}`,
          }),
        );

        setMockedFileSystemService({
          doesFolderExist: (_) => true,
          writeStringToFile: (_, __) => undefined,
        });
      });

      it('Should pass the whole page object as the view to the MustacheService', async () => {
        let passedPage: any;
        setMockedMustacheService({
          render: (view, _) => {
            passedPage = view;
            return '';
          },
        });

        await instance.write({ abc: 'abc' } as any, {
          template: '',
          outDir: '',
          uses: {} as any,
          alsoUses: [],
        });

        expect(passedPage).to.deep.equal({ abc: 'abc' });
      });

      it('Should pass the contents of the file in pageTemplateRule.template as the template to the MustacheService', async () => {
        let passedTemplate: any;
        setMockedMustacheService({
          render: (_, template) => {
            passedTemplate = template;
            return '';
          },
        });

        await instance.write({} as any, {
          template: 'public/test.html',
          outDir: '',
          uses: {} as any,
          alsoUses: [],
        });

        expect(passedTemplate).to.deep.equal('contents of public/test.html');
      });
    });

    describe('Output file writing', () => {
      setup(() => {
        setMockedMustacheService({
          render: (_, __) => {
            return 'populated contents';
          },
        });

        instance.setCachingFileReader(
          asMockedCachingFileReader({
            readAsString: (_) => '',
          }),
        );
      });

      describe('When pageTemplateRule.outDir already exists', () => {
        it('Should write the output file to the already existing folder', async () => {
          let writtenData: any;
          let writtenToPath: any;

          setMockedFileSystemService({
            doesFolderExist: (_) => true,
            writeStringToFile: (data, path) => {
              writtenData = data;
              writtenToPath = path;
            },
          });

          await instance.write({ _title: 'index' } as any, {
            template: 'public/test.html',
            outDir: 'out',
            uses: {} as any,
            alsoUses: [],
          });

          expect(writtenData).to.equal('populated contents');
          expect(writtenToPath).to.equal('out/index.html');
        });
      });

      describe('When pageTemplateRule.outDir does not exist', () => {
        it('Should create the folder', async () => {
          let createdFolder: any;

          setMockedFileSystemService({
            doesFolderExist: (_) => false,
            createFolder: (folder) => {
              createdFolder = folder;
            },
            writeStringToFile: (_, __) => undefined,
          });

          await instance.write({ _title: 'index' } as any, {
            template: 'public/test.html',
            outDir: 'out',
            uses: {} as any,
            alsoUses: [],
          });

          expect(createdFolder).to.equal('out');
        });

        it('Should write the output file to the created folder', async () => {
          let writtenData: any;
          let writtenToPath: any;

          setMockedFileSystemService({
            doesFolderExist: (_) => false,
            createFolder: (_) => undefined,
            writeStringToFile: (data, path) => {
              writtenData = data;
              writtenToPath = path;
            },
          });

          await instance.write({ _title: 'index' } as any, {
            template: 'public/test.html',
            outDir: 'out',
            uses: {} as any,
            alsoUses: [],
          });

          expect(writtenData).to.equal('populated contents');
          expect(writtenToPath).to.equal('out/index.html');
        });
      });
    });
  });
});

describe('BlockChildrenFetcher tests', () => {
  describe('fetchChildren(blockId, notionToken)', () => {
    it('Should return the children for the block as well as their children when they do have children', async () => {
      const blockIdToChildren = {
        'parent-1': [
          {
            id: 'child-1',
            has_children: false,
          },
          {
            id: 'child-2',
            has_children: true,
          },
        ],
        'child-2': [
          {
            id: 'grandchild-1',
            has_children: false,
          },
        ],
      };

      setMockedNotionService({
        getBlockChildren: (args) => {
          async function* ret() {
            yield* (blockIdToChildren as any)[args.blockId] as GetBlockResponse[];
          }

          return ret();
        },
      });

      const instance = new BlockChildrenFetcher();
      expect(await instance.fetchChildren('parent-1', {} as any)).to.deep.equal([
        {
          data: {
            id: 'child-1',
            has_children: false,
          },
          children: [],
        },

        {
          data: {
            id: 'child-2',
            has_children: true,
          },
          children: [
            {
              data: {
                id: 'grandchild-1',
                has_children: false,
              },
              children: [],
            },
          ],
        },
      ]);
    });
  });
});

describe('DatabaseFetcher tests', () => {
  let instance: DatabaseFetcher;
  const fetchDb1Args = {
    databaseRule: {
      database: 'abc',
      takeOnly: 5,
      sort: { sort: 'xxx' } as any,
      filter: { filter: 'yyy' },
    },
    association: {
      name: 'abc',
      notionDatabaseId: 'db-1',
      notionIntegrationToken: {} as Token,
    },
    context: {
      others: {},
      genMarkdownForPage: (_: NotionPage) => '',
    },
    onPostPageMapping: (page: NotionPage) => new Promise<NotionPage>((resolve, _) => resolve(page)),
  };

  const fetchDb2Args = {
    databaseRule: {
      database: 'efg',
    },
    association: {
      name: 'efg',
      notionDatabaseId: 'db-2',
      notionIntegrationToken: {} as Token,
    },
    context: {
      others: {},
      genMarkdownForPage: (_: NotionPage) => '',
    },
    onPostPageMapping: (page: NotionPage) => new Promise<NotionPage>((resolve, _) => resolve(page)),
  };

  setup(() => {
    instance = new DatabaseFetcher();

    const databases = {
      'db-1': { abc: 'abc', id: 'efg' },
      'db-2': { abc: 'abc', id: 'hij' },
    };

    const databasePages = {
      'db-1': [],
      'db-2': [
        {
          id: 'page-1',
        },
        {
          id: 'page-2',
        },
      ],
    };

    const Db2Page1Blocks: NotionBlock[] = [];
    const Db2Page2Blocks: NotionBlock[] = [
      {
        data: {
          id: '',
          has_children: false,
        } as any,
        children: [],
      },
    ];

    const pageBlocks = {
      'page-1': Db2Page1Blocks,
      'page-2': Db2Page2Blocks,
    };

    instance.setBlockChildrenFether(
      asMockedBlockChildrenFetcher({
        fetchChildren: (blockId, _) => new Promise((resolve, _) => resolve((pageBlocks as any)[blockId])),
      }),
    );

    setMockedNotionService({
      getDatabase: (args) => {
        return new Promise((resolve, _) => {
          resolve((databases as any)[args.withId]);
        });
      },
      queryForDatabasePages: (args) => {
        async function* ret() {
          yield* (databasePages as any)[args.databaseId];
        }

        return ret();
      },
    });
  });

  describe('fetchDatabase(args)', () => {
    it('Should return a database with data equal to that returned by NotionService.instance.getDatabase', async () => {
      const returnedDb = await instance.fetchDatabase(fetchDb1Args);

      expect(returnedDb).to.deep.equal({
        pages: [],
        data: { abc: 'abc', id: 'efg' },
      });
    });

    describe('takeOnly, sort, and filter arguments', () => {
      let usedTakeOnly: any;
      let usedSort: any;
      let usedFilter: any;

      async function capturePassedArguments() {
        setMockedNotionService({
          getDatabase: (_) => {
            return new Promise((resolve, _) => {
              resolve({ id: '' } as any);
            });
          },
          queryForDatabasePages: (args) => {
            usedTakeOnly = args.takeOnly;
            usedSort = args.sort;
            usedFilter = args.filter;

            async function* ret() {
              yield* [];
            }

            return ret();
          },
        });

        await instance.fetchDatabase(fetchDb1Args);
      }

      it('Should call NotionService.instance.queryForDatabasePages with the given databaseRule.takeOnly', async () => {
        await capturePassedArguments();
        expect(usedTakeOnly).to.equal(5);
      });

      it('Should call NotionService.instance.queryForDatabasePages with the given databaseRule.sort', async () => {
        await capturePassedArguments();
        expect(usedSort).to.deep.equal({ sort: 'xxx' });
      });

      it('Should call NotionService.instance.queryForDatabasePages with the given databaseRule.filter', async () => {
        await capturePassedArguments();
        expect(usedFilter).to.deep.equal({ filter: 'yyy' });
      });
    });

    describe('For each page yielded by NotionService.instance.queryForDatabasePages', () => {
      describe('When the given databaseRule does have a databaseRule.map closure', () => {
        it('Should pass the page object to the databaseRule.map closure with its blocks already set and page._title equal to page id', async () => {
          const mappedPages: NotionPage[] = [];

          const fetchArgs = {
            databaseRule: {
              database: 'efg',
              map: (page: NotionPage, _: Context) => {
                mappedPages.push(page);
                return page;
              },
            },
            association: {
              name: 'efg',
              notionDatabaseId: 'db-2',
              notionIntegrationToken: {} as Token,
            },
            context: {
              others: {},
              genMarkdownForPage: (_: NotionPage) => '',
            },
            onPostPageMapping: (page: NotionPage) => new Promise<NotionPage>((resolve, _) => resolve(page)),
          };

          await instance.fetchDatabase(fetchArgs);
          expect(mappedPages).to.deep.equal([
            {
              _title: 'page-1',
              otherData: {},
              data: {
                id: 'page-1',
              },
              blocks: [],
            },
            {
              _title: 'page-2',
              otherData: {},
              data: {
                id: 'page-2',
              },
              blocks: [
                {
                  data: {
                    id: '',
                    has_children: false,
                  },
                  children: [],
                },
              ],
            },
          ]);
        });

        it('Should set the page._title to the page id when the databaseRule.map closure does not set it', async () => {
          const database = await instance.fetchDatabase(fetchDb2Args);
          expect(database.pages[0]._title).to.equal('page-1');
          expect(database.pages[1]._title).to.equal('page-2');
        });

        it('Should set the page to that returned by the databaseRule.map closure', async () => {
          const fetchArgs = {
            databaseRule: {
              database: 'efg',
              map: (page: NotionPage, _: Context) => {
                const testObject = {
                  abc: page.data.id,
                };
                return testObject as any;
              },
            },
            association: {
              name: 'efg',
              notionDatabaseId: 'db-2',
              notionIntegrationToken: {} as Token,
            },
            context: {
              others: {},
              genMarkdownForPage: (_: NotionPage) => '',
            },
            onPostPageMapping: (page: NotionPage) => new Promise<NotionPage>((resolve, _) => resolve(page)),
          };

          const database = await instance.fetchDatabase(fetchArgs);
          expect(database.pages[0]).to.deep.equal({ abc: 'page-1' });
          expect(database.pages[1]).to.deep.equal({ abc: 'page-2' });
        });

        it('Should call the passed onPostPageMapping with the page returned by the databaseRule.map closure', async () => {
          const postMappedPages: NotionPage[] = [];

          const fetchArgs = {
            databaseRule: {
              database: 'efg',
              map: (page: NotionPage, _: Context) => {
                const testObject = {
                  abc: page.data.id,
                };
                return testObject as any;
              },
            },
            association: {
              name: 'efg',
              notionDatabaseId: 'db-2',
              notionIntegrationToken: {} as Token,
            },
            context: {
              others: {},
              genMarkdownForPage: (_: NotionPage) => '',
            },
            onPostPageMapping: (page: NotionPage) => {
              postMappedPages.push(page);
              return new Promise<NotionPage>((resolve, _) => resolve(page));
            },
          };

          await instance.fetchDatabase(fetchArgs);
          expect(postMappedPages).to.deep.equal([{ abc: 'page-1' }, { abc: 'page-2' }]);
        });
      });

      describe('When the given databaseRule does NOT have a databaseRule.map closure', () => {
        it('Should set the page._title field of a page to its id', async () => {
          const database = await instance.fetchDatabase(fetchDb2Args);
          expect(database.pages[0]._title).to.equal('page-1');
          expect(database.pages[1]._title).to.equal('page-2');
        });

        it('Should call the passed onPostPageMapping closure with the page object', async () => {
          const postMappedPages: NotionPage[] = [];

          const fetchArgs = {
            databaseRule: {
              database: 'efg',
            },
            association: {
              name: 'efg',
              notionDatabaseId: 'db-2',
              notionIntegrationToken: {} as Token,
            },
            context: {
              others: {},
              genMarkdownForPage: (_: NotionPage) => '',
            },
            onPostPageMapping: (page: NotionPage) => {
              postMappedPages.push(page);
              return new Promise<NotionPage>((resolve, _) => resolve(page));
            },
          };

          await instance.fetchDatabase(fetchArgs);
          expect(postMappedPages).to.deep.equal([
            {
              _title: 'page-1',
              otherData: {},
              data: {
                id: 'page-1',
              },
              blocks: [],
            },
            {
              _title: 'page-2',
              otherData: {},
              data: {
                id: 'page-2',
              },
              blocks: [
                {
                  data: {
                    id: '',
                    has_children: false,
                  },
                  children: [],
                },
              ],
            },
          ]);
        });
      });
    });
  });
});

describe('SecondaryDatabasesFetcher tests', () => {
  describe('fetchAll(databaseRules, databaseAssociations, ctx)', () => {
    it('Should have all the secondary databases for all the given rules in the returned object', () => {});
  });
});

describe('TemplateRuleBuilder tests', () => {
  describe('build(templateRule, databaseAssociations)', () => {
    describe('Call to passed DatabaseFetcher', () => {
      describe('onPostPageMapping callback', () => {
        it('Should populate the given page using the passed TemplateRuleOutputWriter', () => {});
      });
    });

    describe('Context passed SecondaryDatabasesFetcher', () => {
      describe('genPageMarkdown', () => {
        it('Should return page markdown as the returned by the MarkdownService for the page', () => {});
      });
    });
  });
});
