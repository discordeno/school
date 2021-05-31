import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class WebhooksUpdate extends Action {
  handle(data: any) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);
    if (channel) client.emit(Events.WEBHOOKS_UPDATE, channel);
  }
}

export default WebhooksUpdate;
