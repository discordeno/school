import Action from "./Action.ts";
import DMChannel from "../../structures/DMChannel.ts";
import { Events } from "../../util/Constants.ts";
import Client from "../Client.ts";

export class ChannelDeleteAction extends Action {
  deleted: Map<any, any>;

  constructor(client: Client) {
    super(client);
    this.deleted = new Map();
  }

  handle(data: any) {
    const client = this.client;
    const channel = client.channels.cache.get(data.id);

    if (channel) {
      client.channels.remove(channel.id);
      channel.deleted = true;
      // @ts-ignore k then
      if (channel.messages && !(channel instanceof DMChannel)) {
        // @ts-ignore k then
        for (const message of channel.messages.cache.values()) {
          message.deleted = true;
        }
      }
      client.emit(Events.CHANNEL_DELETE, channel);
    }

    return { channel };
  }
}

export default ChannelDeleteAction;
