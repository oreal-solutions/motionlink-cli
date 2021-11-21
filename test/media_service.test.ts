import { describe, it } from 'mocha';
import { expect } from 'chai';
import { MediaDestinationController } from '../src/services/media_service';

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
    describe("When instance is create with TemplateRule that has 'abc' as outDir", () => {
      const instance = makeInstanceWithTemplateOutDir('abc');

      it("Should return 'abc/videos/file1.mp4' when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        const url =
        'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256';
        expect(instance.makeFileDestinationForAssetWithUrl(url)).to.equal('abc/videos/file1.mp4');
      });

      it("Should return 'abc/audio/file1.mp3' when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        const url =
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256';
        expect(instance.makeFileDestinationForAssetWithUrl(url)).to.equal('abc/audio/file1.mp3');
      });

      it("Should return 'abc/other_media/file1' when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        const url =
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1?X-Amz-Algorithm=AWS4-HMAC-SHA256';
        expect(instance.makeFileDestinationForAssetWithUrl(url)).to.equal('abc/other_media/file1');
      });
    });

    describe("When instance is created with TemplateRule that has 'aaa' as outDir", () => {
      const instance = makeInstanceWithTemplateOutDir('aaa');

      it("Should return 'aaa/images/file1.png' when given 'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256'", () => {
        const url =
          'https://s3.us-west-2.amazonaws.com/secure.notion-static.com/05ce5030-65a3-459b-9bac-b1020e3e2a6a/file1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256';
        expect(instance.makeFileDestinationForAssetWithUrl(url)).to.equal('aaa/images/file1.png');
      });
    });
  });
});
