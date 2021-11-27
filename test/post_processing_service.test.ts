import { describe, it } from 'mocha';
import { expect } from 'chai';
import PostProcessingService from '../src/services/post_processing_service';
import { setMockedFileSystemService } from './mocking_utils';

// We get an error when we use import.
// This is the work around for now.
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const chai = require('chai');

declare type InPage = {
  path: string;
  contents: string;
  id: string;
};

declare type OutPage = {
  path: string;
  contents: string;
};

chai.use(deepEqualInAnyOrder);

describe('PostProcessingService tests', () => {
  describe('submit then flush', () => {
    function testSubmitAndFlush(args: { inPages: InPage[]; expectedOutPages: OutPage[] }): void {
      let observedOutPages: OutPage[] = [];

      setMockedFileSystemService({
        writeStringToFile: (data, path) => {
          observedOutPages.push({
            path: path,
            contents: data,
          });
        },
      });

      const instance = new PostProcessingService();
      args.inPages.forEach((page) => instance.submit(page.contents, page.path, page.id));
      instance.flush();

      expect(observedOutPages).to.deep.equalInAnyOrder(args.expectedOutPages);
    }

    it('Should look ahead (i.e page A refrences page B)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'pageA',
            contents: 'Link to B is :::pathTo:::abc:::',
            id: 'page-A-id',
          },

          {
            path: 'pageB',
            contents: 'This is Page B',
            id: 'abc',
          },
        ],
        expectedOutPages: [
          {
            path: 'pageA',
            contents: 'Link to B is pageB',
          },

          {
            path: 'pageB',
            contents: 'This is Page B',
          },
        ],
      });
    });

    it('Should look behind (i.e page B refrences page A)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'pageA',
            contents: 'This is Page A',
            id: 'efg',
          },

          {
            path: 'pageB',
            contents: 'Link to A is :::pathTo:::efg:::',
            id: 'page-B-id',
          },
        ],
        expectedOutPages: [
          {
            path: 'pageA',
            contents: 'This is Page A',
          },

          {
            path: 'pageB',
            contents: 'Link to A is pageA',
          },
        ],
      });
    });

    it('Should look ahead and behind (i.e page C references page D and page B)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'pageB',
            contents: 'This is Page B',
            id: 'abc',
          },

          {
            path: 'pageC',
            contents: 'Link to B is :::pathTo:::abc::: and link to D is :::pathTo:::efg:::',
            id: 'page-C-id',
          },

          {
            path: 'pageD',
            contents: 'This is Page D',
            id: 'efg',
          },
        ],
        expectedOutPages: [
          {
            path: 'pageB',
            contents: 'This is Page B',
          },

          {
            path: 'pageC',
            contents: 'Link to B is pageB and link to D is pageD',
          },

          {
            path: 'pageD',
            contents: 'This is Page D',
          },
        ],
      });
    });

    it('Should flush pages as they are when they do not have any references (i.e page D does not reference any other page)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'pageD',
            contents: 'This is Page D',
            id: 'page-D-id',
          },
        ],
        expectedOutPages: [
          {
            path: 'pageD',
            contents: 'This is Page D',
          },
        ],
      });
    });

    it('Should flush pages when their references never get resolved (i.e page E references page F, which is never submitted)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'pageE',
            contents: 'Link to page F is :::pathTo:::page-F-id:::',
            id: 'page-E-id',
          },
        ],
        expectedOutPages: [
          {
            path: 'pageE',
            contents: 'Link to page F is :::pathTo:::page-F-id:::',
          },
        ],
      });
    });

    describe('Resolving page paths to relative links', () => {
      function testResolvesPathsToRelativeLinks(args: { referenceTo: string; in: string; expectedLink: string }) {
        testSubmitAndFlush({
          inPages: [
            {
              path: args.in,
              contents: 'Link to page B is :::pathTo:::page-B-id:::',
              id: 'page-A-id',
            },

            {
              path: args.referenceTo,
              contents: 'This is page B',
              id: 'page-B-id',
            },
          ],
          expectedOutPages: [
            {
              path: args.in,
              contents: `Link to page B is ${args.expectedLink}`,
            },

            {
              path: args.referenceTo,
              contents: 'This is page B',
            },
          ],
        });
      }

      it("Should resolve reference to './pageB' in './pageA' to './pageB'", () => {
        testResolvesPathsToRelativeLinks({
          referenceTo: './pageB',
          in: './pageA',
          expectedLink: './pageB',
        });
      });

      it("Should resolve reference to 'pageB' in 'pageA' to 'pageB'", () => {
        testResolvesPathsToRelativeLinks({
          referenceTo: 'pageB',
          in: 'pageA',
          expectedLink: 'pageB',
        });
      });

      it("Should resolve reference to 'public/pageB' in 'public/pageA' to 'pageB'", () => {
        testResolvesPathsToRelativeLinks({
          referenceTo: 'public/pageB',
          in: 'public/pageA',
          expectedLink: 'pageB',
        });
      });

      it("Should resolve reference to 'public/pages/pageB' in 'public/pageA' to 'pages/pageB'", () => {
        testResolvesPathsToRelativeLinks({
          referenceTo: 'public/pages/pageB',
          in: 'public/pageA',
          expectedLink: 'pages/pageB',
        });
      });

      it("Should resolve reference to 'public/pageB' in 'public/pages/pageA' to '../pageB'", () => {
        testResolvesPathsToRelativeLinks({
          referenceTo: 'public/pageB',
          in: 'public/pages/pageA',
          expectedLink: '../pageB',
        });
      });

      it("Should resolve reference to 'public/pageB' in 'others/pageA' to 'public/pageB'", () => {
        testResolvesPathsToRelativeLinks({
          referenceTo: 'public/pageB',
          in: 'others/pageA',
          expectedLink: 'public/pageB',
        });
      });
    });

    describe('URL encoding links', () => {
      it("Should encode relative page path './page 2\".md' to './page%202%22.md'", () => {
        testSubmitAndFlush({
          inPages: [
            {
              path: './page 2".md',
              contents: 'This is Page A',
              id: 'efg',
            },

            {
              path: 'pageB',
              contents: 'Link to A is :::pathTo:::efg:::',
              id: 'page-B-id',
            },
          ],
          expectedOutPages: [
            {
              path: './page 2".md',
              contents: 'This is Page A',
            },

            {
              path: 'pageB',
              contents: 'Link to A is ./page%202%22.md',
            },
          ],
        });
      });
    });
  });
});
