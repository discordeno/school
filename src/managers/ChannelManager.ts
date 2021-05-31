import BaseManager from "./BaseManager.ts";
import Channel from "../structures/Channel.ts";
import { Events } from "../util/Constants.ts";
import Client from "../client/Client.ts";
import { ChannelResolvable, Snowflake } from "../../typings/mod.ts";

export class ChannelManager extends BaseManager<Snowflake, Channel, ChannelResolvable> {
  constructor(client: Client, iterable: Iterable<Channel>) {
    super(client, iterable, Channel);
  }

  add(data, guild?: Guild, cache = true) {
    const existing = this.cache.get(data.id);
    if (existing) {
      if (existing._patch && cache) existing._patch(data);
      if (guild) guild.channels.add(existing);
      return existing;
    }

    const channel = Channel.create(this.client, data, guild);

    if (!channel) {
      this.client.emit(Events.DEBUG, `Failed to find guild, or unknown type for channel ${data.id} ${data.type}`);
      return null;
    }

    if (cache) this.cache.set(channel.id, channel);

    return channel;
  }

  remove(id: Snowflake) {
    const channel = this.cache.get(id);
    if (channel?.guild) channel.guild.channels.cache.delete(id);
    this.cache.delete(id);
  }

  async fetch(id: Snowflake, cache = true, force = false) {
    if (!force) {
      const existing = this.cache.get(id);
      // @ts-ignore okay
      if (existing && !existing.partial) return existing;
    }

    // @ts-ignore okay
    const data = await this.client.api.channels(id).get();
    return this.add(data, null, cache);
  }
}

export default ChannelManager;
