# Motionlink-cli

Use Notion as a Content Management System for personal websites, portfolios, blogs, business homepages, and other kinds of static websites.

## Plain Markdown Support

### Supported Notion Blocks

- [x] Paragraph blocks
- [x] Heading one blocks
- [x] Heading two blocks
- [x] Heading three blocks
- [x] Callout blocks
- [x] Quote blocks
- [x] Bulleted list items
- [x] Numbered list item blocks
- [x] TODO blocks
- [ ] Toggle blocks
- [x] Code blocks
- [x] Child page blocks (Adds link to page)
- [x] Child database blocks (Adds link to database)
- [x] Embed blocks (Adds link to resource)
- [x] Image blocks
- [x] Video blocks (Adds link to video)
- [x] File blocks (Adds link to file)
- [x] PDF blocks (Adds link to pdf)
- [x] Bookmark blocks (Adds link to bookmark)
- [x] Equation blocks
- [x] Divider blocks
- [ ] Table of contents blocks
- [ ] Link preview blocks
- [ ] Template blocks
- [ ] Link to page blocks
- [ ] Synced Block blocks
- [ ] Table blocks
- [ ] Table row blocks

### Less likely to be supported blocks

- Column List and Column blocks
- Breadcrumb blocks

## Install

```bash
npm install motionlink-cli --save-dev
```

## Getting started with Motionlink

See the [Getting started guide](https://motionlink.co/docs/Getting%20started).

## Available commands

### Motionlink vars

Motionlink works by connecting a databas in your Notion workspace to a Github repo. This connection is called a link. One link connects one Notion database to one Github repo. Different links are allowed to point to the same Github repo. Each link has an access key that can be used to access the linked Notion database through the Notion API.

It is the access keys that this CLI tool uses to access your databases to feed content into your static website. Access keys, however, are alphanumeric strings that can be hard for a human to remember. A pair string of `DB_NAME=ACCESS_KEY` is referred to as a Motionlink var. A Motionlink var maps an alias name to a link access key for easy referencing from config files. Motionlink vars can be combined into one string by simply separating them with spaces: `DB_NAME1=ACCESS_KEY1 DB_NAME2=ACCESS_KEY2 ...`.

Motionlink Vars can be generated from the [Console App](https://app.motionlink.co/) by creating a [new Link](https://motionlink.co/docs/Getting%20started#create-a-link). Selecting a link on the console should enable a "Show Args" button at the top of the page that, when clicked, shows the MotionLink vars that can be used with this CLI to access that link. You can select multiple links before clicking "Show Args" to allow the CLI access to all the databases the links connect.

An easier way of creating links, however is via the connect command (See below).

Once you have your Motionlink [config file](https://motionlink.co/docs/CLI), you can use the CLI with the following commands.

### Classic build

The classic build command lets you run your config file by passing your Motionlink vars string on the command line. If working with one link, this command might not be an issue, but for very long Motionlink vars strings it can be hard to read.

```bash
npx motionlink {MOTIONLINK_VARS}
```

_Replace {MOTIONLINK_VARS} with the Motionlink vars._

### Build

The build command runs your config file with the Motionlink vars found in the your `.mlvars` file.

```bash
npx motionlink build
```

Say your `.mlvars` file contains the text:

```bash
posts=31a49b161d214258bd3c43e83c26f64a bloggerInfo=d2cb2fab93eb49d1bcb02ab4e5f8f4ab
```

Then the above command is equivalent the classic build:

```bash
npx motionlink posts=31a49b161d214258bd3c43e83c26f64a bloggerInfo=d2cb2fab93eb49d1bcb02ab4e5f8f4ab
```

### Connect

The connect command is a complement to the build command in the sense that it automatically create links for your project from your Notion dashboard and creates the `.mlvars` file for you. This command makes setting up links a lot easier. This command can also setup Netlify hosting for your project which means all you will need to do is push your code and start publishing from Notion.

```bash
npx motionlink connect
```

You will be promted for the remote URL to your Github repository as well as whether or not you want to setup Netlify hosting for your project. After collecting all the necessary information, this command will make an OAuth-like request to the Motionlink Console where you will be required to sign into Github, Notion, and optionally Netlify.

> Netlify OAuth can sometimes not redirect back to the application if you were logged out. If this happens, simply follow the printent link again. It always redirects when you are logged in already.

This command expects your Notion dashboard to be setup like a [Motionlink Website](https://motionlink.co/docs/Installing%20websites) dashboard. That is, the root page of the dashboard has the following properties:

1. The title of the root page should contain the git remote URL for your website
2. And it needs to list the databases (collections) below the callout block

An example of such a dashboard can be seen [here](https://oreal-motionlink.notion.site/Team-Blogger-https-github-com-oreal-solutions-team-blogger-template-d8a0a4bd3d32445e871a2250541cee94).

If you selected to deploy to Netlify, this command will push Netlify deploy secrets as well as Motionlink vars to your Github repo and also add a `deploy.yml` workflow file to your project. This workflow file uses the secrets to build and deploy the website upon a push or when Motionlink reports a [publish event](https://motionlink.co/docs/How%20it%20works) by tagging the repo.

For more complicated projects, like those that use Jekyll or Hugo, you may need to update the workflow file to install required binaries before running the build command. If you do not plan to host with Netlify, simply opt out of Netlify hosting and setup your own workflow(s).

## Contributing

Feel free to contribute, drop issues and rquest features! We also have a our [discussions](https://github.com/oreal-solutions/motionlink-cli/discussions) tab enabled. Feel free to start conversations.

## Author

[Batandwa Mgutsi](https://github.com/bats64mgutsi)
