import { describe, it } from 'mocha';
import { expect } from 'chai';
import { DatabaseRule } from '../src/models/config_models';
import { NotionDatabaseAssociation } from '../src/models/app_models';
import { newBuildService } from '../src/services/build_service';

describe('BuildService tests', () => {
  describe('_getDatabaseAssociationForRuleAndThrowIfNotExists', () => {
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

      expect(
        newBuildService()._getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists(rule, associations),
      ).to.deep.equal({
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
        newBuildService()._getDatabaseAssociationForDatabaseRuleAndThrowIfNotExists(rule, []);
      } catch (e) {
        thrownError = e as any;
      }

      expect(thrownError.message).to.equal('The database association "abc" does not exist.');
    });
  });

  describe('_getFileExtension', () => {
    it("Should return 'md' when given 'abc.def.md'", () => {
      expect(newBuildService()._getFileExtension('abc.def.md')).to.equal('md');
    });

    it("Should return empty string when given 'abc'", () => {
      return expect(newBuildService()._getFileExtension('abc')).to.be.empty;
    });
  });
});
