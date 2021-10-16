import MotionLinkApi from '../api_wrappers/motion_link_api';
import { Association, NotionDatabaseAssociation } from '../models/app_models';

export default class AssociationsService {
  public async toNotionDatabaseAssociations(associations: Association[]): Promise<NotionDatabaseAssociation[]> {
    const out: NotionDatabaseAssociation[] = [];
    for (const association of associations) {
      out.push({
        name: association.key,
        notionDatabaseId: await MotionLinkApi.instance.getNotionDatabaseIdForLink(association.value),
        notionIntegrationToken: await MotionLinkApi.instance.getNotionTokenForLink(association.value),
      });
    }

    return out;
  }

  private static _instance: AssociationsService;
  public static get instance(): AssociationsService {
    return this._instance ?? (this._instance = new AssociationsService());
  }
}
