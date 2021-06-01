import BaseManager from "./BaseManager.ts";
import { DJSError } from "../errors/mod.ts";
import Message from "../structures/Message.ts";
import Collection from "../util/Collection.ts";
import LimitedCollection from "../util/LimitedCollection.ts";

export class MessageManager extends BaseManager<Snowflake, Message, MessageResolvable> {
  channel: TextBasedChannel;

  constructor(channel: TextChannel | DMChannel, iterable?: Iterable<any>) {
    super(channel.client, iterable, Message, LimitedCollection, channel.client.options.messageCacheMaxSize);

    this.channel = channel;
  }

  add(data, cache) {
    return super.add(data, cache, { extras: [this.channel] });
  }

  fetch(message: ChannelLogsQueryOptions, cache = true, force = false) {
    return typeof message === "string" ? this._fetchId(message, cache, force) : this._fetchMany(message, cache);
  }

  fetchPinned(cache = true) {
    return this.client.api.channels[this.channel.id].pins.get().then((data) => {
      const messages = new Collection();
      for (const message of data) messages.set(message.id, this.add(message, cache));
      return messages;
    });
  }

  async delete(message: MessageResolvable, reason?: string) {
    message = this.resolveID(message);
    if (!message) throw new DJSError.TypeError("INVALID_TYPE", "message", "MessageResolvable");

    await this.client.api.channels(this.channel.id).messages(message).delete({ reason });
  }

  async _fetchId(messageID: string, cache?: boolean, force?: boolean) {
    if (!force) {
      const existing = this.cache.get(messageID);
      if (existing && !existing.partial) return existing;
    }

    const data = await this.client.api.channels[this.channel.id].messages[messageID].get();
    return this.add(data, cache);
  }

  async _fetchMany(options = {}, cache?: boolean) {
    const data = await this.client.api.channels[this.channel.id].messages.get({ query: options });
    const messages = new Collection();
    for (const message of data) messages.set(message.id, this.add(message, cache));
    return messages;
  }
}

export default MessageManager;
