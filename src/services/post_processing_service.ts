import FileSystemService from './file_system_service';

/**
 * Buffers a file write and only writes it to the file system once all the links
 * it has to other pages have been resolved.
 *
 * Notion allows users to mention other pages in their pages. When the
 * Markdown for a page with such links is generated, we want to maintain these
 * links. However, by the time the page is generated, some of the pages
 * it mentions might not be generated yet, which means we will not know
 * their paths in the output directory. To fix this we allow the markdown
 * transfomers, and config files, to use path placeholders when linking to a
 * a page that is yet to be generated.
 *
 * A path placeholder has the form `:::pathTo:::page_id:::`, where page_id is the id
 * of the page being linked to. When the text content of a page is submitted, the
 * `PostProcessingService` looks for all the other buffered pages that link
 * to the page and overwrites the path placelders with the actual path to the page,
 * such that a page is only flushed to the file system once all the path placeholders
 * it has have been resolved.
 *
 * The {@link flush} method can be used to force all buffered pages to be written to the
 * file system. This should be called when there are no more pages expected to be
 * generated.
 *
 * Using post processing to solve the page linking problem only works if the pages
 * being linked to are going to be generated. If not, the links will be broken.
 */
export default class PostProcessingService {
  private readonly pagePaths: { pageId: string; path: string }[] = [];
  private readonly pagesWithLinks: { path: string; data: string }[] = [];

  public submit(content: string, pgPath: string, pgId: string): void {
    this.pagePaths.push({
      pageId: pgId,
      path: pgPath,
    });

    if (content.indexOf(':::pathTo:::') > 0) {
      this.pagesWithLinks.push({
        path: pgPath,
        data: content,
      });
    } else {
      FileSystemService.instance.writeStringToFile(content, pgPath);
    }
  }

  public flush(): void {
    for (const pagePath of this.pagePaths) {
      for (const pageWithLink of this.pagesWithLinks) {
        pageWithLink.data = pageWithLink.data.replace(`:::pathTo:::${pagePath.pageId}:::`, pagePath.path);
      }
    }

    for (const page of this.pagesWithLinks) {
      FileSystemService.instance.writeStringToFile(page.data, page.path);
    }
  }

  private static _instance: PostProcessingService;
  public static get instance(): PostProcessingService {
    return this._instance ?? (this._instance = new PostProcessingService());
  }

  public static setMockedInstance(instance: PostProcessingService) {
    this._instance = instance;
  }
}
