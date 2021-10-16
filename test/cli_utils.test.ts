import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Association } from '../src/models/app_models';
import { compileAssociations } from '../src/cli_utils';

describe('cli_utils tests', () => {
  describe('compileAssociation', () => {
    it('Should return an empty list when given a string with whitespaces only', () => {
      expect(compileAssociations('  \n \t')).to.be.empty;
    });

    it("Should return [abc -> bcd, aaa -> bbb] object when given 'abc=bcd aaa=bbb'", () => {
      expect(compileAssociations('abc=bcd aaa=bbb')).to.deep.equal([
        {
          key: 'abc',
          value: 'bcd',
        },
        {
          key: 'aaa',
          value: 'bbb',
        },
      ] as Association[]);
    });
  });
});
