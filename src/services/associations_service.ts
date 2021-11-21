import MotionLinkApi from '../api_wrappers/motion_link_api';
import { Association, NotionDatabaseAssociation, Token } from '../models/app_models';

export default class AssociationsService {
  public async toNotionDatabaseAssociations(associations: Association[]): Promise<NotionDatabaseAssociation[]> {
    const promises = new Array<
      Promise<{ data: { notionDatabaseId: string; notionIntegrationToken: Token }; key: string }>
    >();

    const makeAssociationData = async (association: Association) => {
      return {
        data: await this.getLinkData(association.value),
        key: association.key,
      };
    };

    for (const association of associations) {
      promises.push(makeAssociationData(association));
    }

    const data = await Promise.all(promises);
    return data.map((linkData) => {
      return {
        name: linkData.key,
        notionDatabaseId: linkData.data.notionDatabaseId,
        notionIntegrationToken: linkData.data.notionIntegrationToken,
      };
    });
  }

  private async getLinkData(
    linkAccessKey: string,
  ): Promise<{ notionDatabaseId: string; notionIntegrationToken: Token }> {
    const promises = [
      MotionLinkApi.instance.getNotionDatabaseIdForLink(linkAccessKey),
      MotionLinkApi.instance.getNotionTokenForLink(linkAccessKey),
    ];

    const linkData = await Promise.all(promises as any[]);
    return {
      notionDatabaseId: linkData[0],
      notionIntegrationToken: linkData[1],
    };
  }

  private static _instance: AssociationsService;
  public static get instance(): AssociationsService {
    return this._instance ?? (this._instance = new AssociationsService());
  }
}
