
/** @type {import("motionlink-cli/lib/models/config_models").TemplateRule[]} */
const rules = [
  {
    template: 'templates/page.template.txt',
    outDir: 'public',
    uses: {
      database: 'hello',
      takeOnly: 100,
      map: (page, ctx) => {
        page.otherData.stringDump = JSON.stringify(page.data);
        page.otherData.test = 'Hello!';

        // All Notion pages have a title. Users are, however, allowed to change the name for the title.
        // In this example, the title is in 'Name'. That is, the title column in the db is named 'Name' for
        // this example. In a database of authors, for example, you may want the title to be 'Author', in which
        // case the way to read the title text would be:
        //
        // page._title = page.data.properties.Author.title[0].plain_text;
        page._title = page.data.properties.Name.title[0].plain_text;
        return page;
      },
    },
    alsoUses: [],
  },
];

module.exports = rules;
