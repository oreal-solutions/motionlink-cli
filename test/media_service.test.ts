import { describe, it } from 'mocha';
import { expect } from 'chai';
import { MediaDestinationController } from '../src/services/media_service';
import { setMockedFileSystemService } from './mocking_utils';

describe('MediaDestinationController tests', () => {
  function makeInstanceWithTemplateOutDir(outDir: string): MediaDestinationController {
    return new MediaDestinationController({
      forRule: {
        template: 'rrrr',
        outDir: outDir,
        uses: {} as any,
        alsoUses: [],
      },
    });
  }

  describe('makeFileDestionationForAsset(args)', () => {
    describe("When instance is create with TemplateRule that has 'abc' as outDir and undefined for writeMediaTo", () => {
      const instance = makeInstanceWithTemplateOutDir('abc');

      function assertDoesNotCreateAnyFolderWhenMediaFolderExists(url: string) {
        let didCreateFolder = false;

        setMockedFileSystemService({
          doesFolderExist: (_) => true,
          createFolder: (_) => (didCreateFolder = true),
        });

        instance.makeFileDestinationForAssetWithUrl(url);
        expect(didCreateFolder).to.be.false;
      }

      function assertCreatesMediaFolderWhenNotExist(path: string, url: string) {
        let createdFolder = '';

        setMockedFileSystemService({
          doesFolderExist: (_) => false,
          createFolder: (p) => (createdFolder = p),
        });

        instance.makeFileDestinationForAssetWithUrl(url);
        expect(createdFolder).to.equal(path);
      }

      it("Should return 'videos/file1.mp4' when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        const url =
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256';
        expect(instance.makeFileDestinationForAssetWithUrl(url)).to.equal('videos/file1.mp4');
      });

      it("Should return 'audio/file1.mp3' when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        const url =
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256';
        expect(instance.makeFileDestinationForAssetWithUrl(url)).to.equal('audio/file1.mp3');
      });

      it("Should return 'other_media/file1' when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        const url =
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256';
        expect(instance.makeFileDestinationForAssetWithUrl(url)).to.equal('other_media/file1');
      });

      it("Should create folder 'abc/videos' if not exists when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        assertCreatesMediaFolderWhenNotExist(
          'abc/videos',
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256',
        );
      });

      it("Should NOT create folder 'abc/videos' if it exists when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        assertDoesNotCreateAnyFolderWhenMediaFolderExists(
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256',
        );
      });

      it("Should create folder 'abc/other_media' if not exists when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        assertCreatesMediaFolderWhenNotExist(
          'abc/other_media',
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256',
        );
      });

      it("Should NOT create folder 'abc/other_media' if it exists when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        assertDoesNotCreateAnyFolderWhenMediaFolderExists(
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256',
        );
      });
    });
  });

  describe('static getAbsoluteDestinationPath(rule, subfolderNAme', () => {
    describe("When subfolderName is 'zrc'", () => {
      it("Should return 'abc/zrc' when  outDir is 'abc' and writeMediaTo is undefined", () => {
        expect(MediaDestinationController.getAbsoluteDestinationPath('abc', undefined, 'zrc')).to.equal('abc/zrc');
      });

      it("Should return 'efg/zrc' when  outDir is 'abc' and writeMediaTo is 'efg'", () => {
        expect(MediaDestinationController.getAbsoluteDestinationPath('abc', 'efg', 'zrc')).to.equal('efg/zrc');
      });
    });
  });
});
