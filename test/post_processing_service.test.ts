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
            path: 'page/A',
            contents: 'Link to B is :::pathTo:::abc:::',
            id: 'page-A-id',
          },

          {
            path: 'page/B',
            contents: 'This is Page B',
            id: 'abc',
          },
        ],
        expectedOutPages: [
          {
            path: 'page/A',
            contents: 'Link to B is page/B',
          },

          {
            path: 'page/B',
            contents: 'This is Page B',
          },
        ],
      });
    });

    it('Should look behind (i.e page B refrences page A)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'page/A',
            contents: 'This is Page A',
            id: 'efg',
          },

          {
            path: 'page/B',
            contents: 'Link to A is :::pathTo:::efg:::',
            id: 'page-B-id',
          },
        ],
        expectedOutPages: [
          {
            path: 'page/A',
            contents: 'This is Page A',
          },

          {
            path: 'page/B',
            contents: 'Link to A is page/A',
          },
        ],
      });
    });

    it('Should look ahead and behind (i.e page C references page D and page B)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'page/B',
            contents: 'This is Page B',
            id: 'abc',
          },

          {
            path: 'page/C',
            contents: 'Link to B is :::pathTo:::abc::: and link to D is :::pathTo:::efg:::',
            id: 'page-C-id',
          },

          {
            path: 'page/D',
            contents: 'This is Page D',
            id: 'efg',
          },
        ],
        expectedOutPages: [
          {
            path: 'page/B',
            contents: 'This is Page B',
          },

          {
            path: 'page/C',
            contents: 'Link to B is page/B and link to D is page/D',
          },

          {
            path: 'page/D',
            contents: 'This is Page D',
          },
        ],
      });
    });

    it('Should flush pages as they are when they do not have any references (i.e page D does not reference any other page)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'page/D',
            contents: 'This is Page D',
            id: 'page-D-id',
          },
        ],
        expectedOutPages: [
          {
            path: 'page/D',
            contents: 'This is Page D',
          },
        ],
      });
    });

    it('Should flush pages when their references never get resolved (i.e page E references page F, which is never submitted)', () => {
      testSubmitAndFlush({
        inPages: [
          {
            path: 'page/E',
            contents: 'Link to page F is :::pathTo:::page-F-id:::',
            id: 'page-E-id',
          },
        ],
        expectedOutPages: [
          {
            path: 'page/E',
            contents: 'Link to page F is :::pathTo:::page-F-id:::',
          },
        ],
      });
    });
  });
});
