import { Association } from './models/app_models';

export function compileAssociations(source: string): Association[] {
  source = source.trim();
  if (source.length === 0) return [];

  const stringAssociations = source.split(' ');
  return stringAssociations.map((stringAssociation) => {
    const units = stringAssociation.split('=');
    return {
      key: units[0],
      value: units[1],
    };
  });
}
