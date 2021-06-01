import BaseManager from "./BaseManager.ts";
import GuildChannel from "../structures/GuildChannel.ts";
import PermissionOverwrites from "../structures/PermissionOverwrites.ts";
import { ChannelTypes } from "../util/Constants.ts";
import { Snowflake, GuildChannelResolvable } from "../../typings/mod.ts";

export class GuildChannelManager extends BaseManager<Snowflake, GuildChannel, GuildChannelResolvable> {
  guild: Guild;

  constructor(guild: Guild, iterable: Iterable<GuildChannel>) {
    super(guild.client, iterable, GuildChannel);

    this.guild = guild;
  }

  add(channel: GuildChannel) {
    const existing = this.cache.get(channel.id);
    if (existing) return existing;
    this.cache.set(channel.id, channel);
    return channel;
  }

  async create(name: string, options: Record<string, any> = {}) {
    let { type, topic, nsfw, bitrate, userLimit, parent, permissionOverwrites, position, rateLimitPerUser, reason } =
      options;
    if (parent) parent = this.client.channels.resolveID(parent);
    if (permissionOverwrites) {
      permissionOverwrites = permissionOverwrites.map((o: any) => PermissionOverwrites.resolve(o, this.guild));
    }

    // @ts-ignore should work
    const data = await this.client.api.guilds(this.guild.id).channels.post({
      data: {
        name,
        topic,
        // @ts-ignore should work
        type: type ? ChannelTypes[type.toUpperCase()] : ChannelTypes.TEXT,
        nsfw,
        bitrate,
        user_limit: userLimit,
        parent_id: parent,
        position,
        permission_overwrites: permissionOverwrites,
        rate_limit_per_user: rateLimitPerUser,
      },
      reason,
    });
    return this.client.actions.ChannelCreate.handle(data).channel;
  }
}

export default GuildChannelManager;
