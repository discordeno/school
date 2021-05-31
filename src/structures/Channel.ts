import Base from "./Base.ts";
import { ChannelTypes } from "../util/Constants.ts";
import Snowflake from "../util/Snowflake.ts";
import Client from "../client/Client.ts";
import Structures from "../util/Structures.ts";
import PartialGroupDMChannel from "./PartialGroupDMChannel.ts";

export class Channel extends Base {
  type: string;
  deleted: boolean;
  id!: string;

  constructor(client: Client, data) {
    super(client);

    const type = Object.keys(ChannelTypes)[data.type];
    this.type = type ? type.toLowerCase() : "unknown";
    this.deleted = false;

    if (data) this._patch(data);
  }

  _patch(data) {
    this.id = data.id;
  }

  get createdTimestamp() {
    return Snowflake.deconstruct(this.id).timestamp;
  }

  get createdAt() {
    return new Date(this.createdTimestamp);
  }

  toString() {
    return `<#${this.id}>`;
  }

  delete() {
    return (
      this.client.api
        // @ts-ignore okay then
        .channels(this.id)
        .delete()
        .then(() => this)
    );
  }

  fetch(force = false) {
    return this.client.channels.fetch(this.id, true, force);
  }

  isText() {
    return "messages" in this;
  }

  static create(client: Client, data, guild: Guild) {
    let channel;
    if (!data.guild_id && !guild) {
      if ((data.recipients && data.type !== ChannelTypes.GROUP) || data.type === ChannelTypes.DM) {
        const DMChannel = Structures.get("DMChannel");
        channel = new DMChannel(client, data);
      } else if (data.type === ChannelTypes.GROUP) {
        channel = new PartialGroupDMChannel(client, data);
      }
    } else {
      guild = guild || client.guilds.cache.get(data.guild_id);
      if (guild) {
        switch (data.type) {
          case ChannelTypes.TEXT: {
            const TextChannel = Structures.get("TextChannel");
            channel = new TextChannel(guild, data);
            break;
          }
          case ChannelTypes.VOICE: {
            const VoiceChannel = Structures.get("VoiceChannel");
            channel = new VoiceChannel(guild, data);
            break;
          }
          case ChannelTypes.CATEGORY: {
            const CategoryChannel = Structures.get("CategoryChannel");
            channel = new CategoryChannel(guild, data);
            break;
          }
          case ChannelTypes.NEWS: {
            const NewsChannel = Structures.get("NewsChannel");
            channel = new NewsChannel(guild, data);
            break;
          }
          case ChannelTypes.STORE: {
            const StoreChannel = Structures.get("StoreChannel");
            channel = new StoreChannel(guild, data);
            break;
          }
        }
        if (channel) guild.channels.cache.set(channel.id, channel);
      }
    }
    return channel;
  }

  // @ts-ignore rtjtrmjfjnsw
  toJSON(...props) {
    return super.toJSON({ createdTimestamp: true }, ...props);
  }
}

export default Channel;
