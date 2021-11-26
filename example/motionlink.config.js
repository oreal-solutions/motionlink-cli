const markdownService = require('motionlink-cli/lib/services/markdown_service');
const ObjectTransformers = markdownService.ObjectTransformers;

/** @type {import("motionlink-cli/lib/models/config_models").TemplateRule[]} */
const rules = [
  {
    template: 'templates/page.template.md',
    outDir: 'public',
    uses: {
      database: 'db',
      takeOnly: 100,
      fetchBlocks: true,
      map: (page, ctx) => {
        // Setting page._title overwrites the file name for this page, which is the page id by default.
        //
        // All Notion pages have a title. Users are, however, allowed to change the name for the title property in the
        // Notion UI. In this example, the title property is 'Name'. That is, the title column in the database is named
        // 'Name' for this example. In a database of authors, for example, you may want the title to be 'Author', in which
        // case the way to read the title text would be:
        //
        // page._title = page.data.properties.Author.title[0].plain_text;
        //
        // By default the title property is name 'Name'.
        page._title = page.data.properties.Name.title[0].plain_text;

        // Use page.otherData to pass computed, or any other, data to template files.
        page.otherData.titleMarkdown = '# ' + ObjectTransformers.transform_all(page.data.properties.Name.title);
        page.otherData.content = ctx.genMarkdownForBlocks(page.blocks);

        return page;
      },
    },
    alsoUses: [],
  },
];

module.exports = rules;
