import { compileAssociations } from './cli_utils';
import { getLogger } from './logger';
import { TemplateRule } from './models/config_models';
import AssociationsService from './services/associations_service';
import { newBuildService } from './services/build_service';
import ConsoleService, { Host } from './services/console_service';
import GitService from './services/git_service';
import MediaService from './services/media_service';
import PostProcessingService from './services/post_processing_service';
import makePrompt from 'prompt-sync';
import FileSystemService from './services/file_system_service';
import { getNetlifyDeployWorkflow } from './constants/cli_files';

export default async function main() {
  const logger = getLogger();
  const mlVarsFilePath = `${process.cwd()}/.mlvars`;
  const deployWorkflowFilePath = `${process.cwd()}/.github/workflows/deploy.yml`;
  const deployWorkflowParentPath = `${process.cwd()}/.github/workflows`;
  const gitignoreFilePath = `${process.cwd()}/.gitignore`;

  if (process.argv.length < 3) throw new Error('Too few arguments passed');

  if (process.argv[2] === 'connect') {
    const prompt = makePrompt({ sigint: true });
    const detectedRemoteUrl = await GitService.instance.findGitRemoteUrl(process.cwd());

    console.log(
      `This command lets you connect your Notion workspace to your Github repository. To find the databases to connect, ` +
        `Motionlink will look for a Notion page whose title contains the text '${detectedRemoteUrl}'. If this is not the repo you want ` +
        `to connect, enter the git remote URL for the repo you want to connect (without .git at the end).\n`,
    );

    let remoteUrl = prompt(
      `Enter the url of the repo to connect. Press enter to skip and use '${detectedRemoteUrl}': `,
    );
    remoteUrl = remoteUrl.length === 0 ? detectedRemoteUrl : remoteUrl;

    const useNetlify =
      prompt('Would you like to configure this project to deploy to Netlify? [y/n]: ').toLowerCase() === 'y';
    const host = useNetlify ? Host.netlify : Host.none;

    let buildCommand = 'npm build';
    let publicFolder = './public';
    if (useNetlify) {
      let input = prompt(`What is the command used to build your project? [${buildCommand}]: `);
      buildCommand = input.length === 0 ? buildCommand : input;

      input = prompt(`What is your site public folder? [${publicFolder}]: `);
      publicFolder = input.length === 0 ? publicFolder : input;
    }

    console.log('Follow the link below to authorize the connect request:');
    const connectResult = await ConsoleService.instance.connect(remoteUrl, host, process.env.ML_CONSOLE);

    console.log(
      `Connect request complete. ${
        useNetlify
          ? 'Site available at below URL. Note that initially the Netlify site will be empty. It will be populated once you push your code.'
          : ''
      }`,
    );
    if (useNetlify) {
      logger.logWithColor(connectResult.secureUrl ?? '');
    }

    console.log('Saving Motionlink vars...');
    FileSystemService.instance.writeStringToFile(connectResult.vars, mlVarsFilePath);

    let gitignore = '';
    try {
      gitignore = FileSystemService.instance.readFileAsString(gitignoreFilePath);
    } catch (e) {
      console.log('... No .gitignore file. Will create one.');
    }

    gitignore = `${gitignore}\n\n# Motionlink Vars\n.mlvars\n`;
    FileSystemService.instance.writeStringToFile(gitignore, gitignoreFilePath);

    if (useNetlify) {
      console.log('Saving github workflows...');
      if (!FileSystemService.instance.doesFolderExist(deployWorkflowParentPath)) {
        FileSystemService.instance.createFolder(deployWorkflowParentPath);
      }

      FileSystemService.instance.writeStringToFile(
        getNetlifyDeployWorkflow(buildCommand, publicFolder),
        deployWorkflowFilePath,
      );
    }

    console.log('All Done!');
    process.exit(0);
  } else {
    let motionlinkVars = [...process.argv].splice(2).join(' ');
    if (process.argv[2] === 'build') {
      motionlinkVars = FileSystemService.instance.readFileAsString(mlVarsFilePath).trim();
    }

    const associations = compileAssociations(motionlinkVars);
    const dbAssociations = await AssociationsService.instance.toNotionDatabaseAssociations(associations);

    const configFile = `${process.cwd()}/motionlink.config.js`;
    const templateRules: TemplateRule[] = require(configFile);

    await newBuildService().build(templateRules, dbAssociations);
    await MediaService.instance.commit();
    PostProcessingService.instance.flush();
  }
}
