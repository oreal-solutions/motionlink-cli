#!/usr/bin/env node

import { compileAssociations } from './cli_utils';
import { TemplateRule } from './models/config_models';
import AssociationsService from './services/associations_service';
import { newBuildService } from './services/build_service';
import MediaService from './services/media_service';

async function main() {
  if (process.argv.length < 3) throw new Error('Too few arguments passed');
  const associations = compileAssociations(process.argv.splice(2).join(' '));
  const dbAssociations = await AssociationsService.instance.toNotionDatabaseAssociations(associations);

  const configFile = `${process.cwd()}/motionlink.config.js`;
  const templateRules: TemplateRule[] = require(configFile);

  await newBuildService().build(templateRules, dbAssociations);
  await MediaService.instance.commit();
}

main();
