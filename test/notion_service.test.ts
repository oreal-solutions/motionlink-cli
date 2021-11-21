import { describe, it } from 'mocha';
import { expect } from 'chai';
import { APIErrorCode } from '@notionhq/client/build/src';
import { resultOf } from '../src/services/notion_service';

describe('service_utils tests', () => {
  describe('_resultOf', () => {
    it('Should return the value returned by the passed closure', async () => {
      const promise = new Promise<string>((resolve, _) => resolve('abc'));
      expect(await resultOf(() => promise)).to.equal('abc');
    });

    describe('When the passed closure throws Notion API rate limit error', () => {
      it('should sleep for 333 milliseconds', async () => {
        const before = Date.now();
        let count = 0;

        await resultOf(() => {
          count++;
          return new Promise<string>((resolve, reject) => {
            if (count < 2) reject({ status: APIErrorCode.RateLimited });
            else resolve('abc');
          });
        });

        const diff = Date.now() - before;
        expect(diff).to.be.greaterThanOrEqual(333).but.lessThan(400);
      });

      it('Should return the value the passed closure eventually returns', async () => {
        let count = 0;

        const ret = await resultOf(() => {
          count++;
          return new Promise<string>((resolve, reject) => {
            if (count < 2) reject({ status: APIErrorCode.RateLimited });
            else resolve('abc');
          });
        });

        expect(ret).to.equal('abc');
      });
    });

    describe('When the passed closure throws an error that is NOT a Notion API rate limit error', () => {
      it('Should rethrow the error', async () => {
        let thrownError: any;

        try {
          await resultOf(() => {
            return new Promise((_, reject) => {
              reject('abc');
            });
          });
        } catch (e) {
          thrownError = e;
        }

        expect(thrownError).to.equal('abc');
      });
    });
  });
});
