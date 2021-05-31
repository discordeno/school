import Action from "./Action.ts";
import Channel from "../../structures/Channel.ts";
import { ChannelTypes } from "../../util/Constants.ts";

export class ChannelUpdateAction extends Action {
  handle(data: any) {
    const client = this.client;

    let channel = client.channels.cache.get(data.id);
    if (channel) {
      const old = channel._update(data);

      // @ts-ignore okay then
      if (ChannelTypes[channel.type.toUpperCase()] !== data.type) {
        // @ts-ignore okay then
        const newChannel = Channel.create(this.client, data, channel.guild);
        // @ts-ignore okay then
        for (const [id, message] of channel.messages.cache) newChannel.messages.cache.set(id, message);
        // @ts-ignore okay then
        newChannel._typing = new Map(channel._typing);
        channel = newChannel;
        // @ts-ignore okay then
        this.client.channels.cache.set(channel.id, channel);
      }

      return {
        old,
        updated: channel,
      };
    }

    return {};
  }
}

export default ChannelUpdateAction;
