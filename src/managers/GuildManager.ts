import BaseManager from "./BaseManager.ts";
import Guild from "../structures/Guild.ts";
import GuildChannel from "../structures/GuildChannel.ts";
import GuildEmoji from "../structures/GuildEmoji.ts";
import GuildMember from "../structures/GuildMember.ts";
import Invite from "../structures/Invite.ts";
import Role from "../structures/Role.ts";
import {
  ChannelTypes,
  Events,
  VerificationLevels,
  DefaultMessageNotifications,
  ExplicitContentFilterLevels,
} from "../util/Constants.ts";
import DataResolver from "../util/DataResolver.ts";
import Permissions from "../util/Permissions.ts";
import { resolveColor } from "../util/Util.ts";
import { Snowflake } from "../../typings/mod.ts";

export class GuildManager extends BaseManager<Snowflake, Guild, GuildResolvable> {
  constructor(client, iterable) {
    super(client, iterable, Guild);
  }

  resolve(guild) {
    if (
      guild instanceof GuildChannel ||
      guild instanceof GuildMember ||
      guild instanceof GuildEmoji ||
      guild instanceof Role ||
      (guild instanceof Invite && guild.guild)
    ) {
      return super.resolve(guild.guild);
    }
    return super.resolve(guild);
  }

  resolveID(guild) {
    if (
      guild instanceof GuildChannel ||
      guild instanceof GuildMember ||
      guild instanceof GuildEmoji ||
      guild instanceof Role ||
      (guild instanceof Invite && guild.guild)
    ) {
      return super.resolveID(guild.guild.id);
    }
    return super.resolveID(guild);
  }

  async create(
    name,
    {
      afkChannelID,
      afkTimeout,
      channels = [],
      defaultMessageNotifications,
      explicitContentFilter,
      icon = null,
      region,
      roles = [],
      systemChannelID,
      verificationLevel,
    } = {}
  ) {
    icon = await DataResolver.resolveImage(icon);
    if (typeof verificationLevel !== "undefined" && typeof verificationLevel !== "number") {
      verificationLevel = VerificationLevels.indexOf(verificationLevel);
    }
    if (typeof defaultMessageNotifications !== "undefined" && typeof defaultMessageNotifications !== "number") {
      defaultMessageNotifications = DefaultMessageNotifications.indexOf(defaultMessageNotifications);
    }
    if (typeof explicitContentFilter !== "undefined" && typeof explicitContentFilter !== "number") {
      explicitContentFilter = ExplicitContentFilterLevels.indexOf(explicitContentFilter);
    }
    for (const channel of channels) {
      if (channel.type) channel.type = ChannelTypes[channel.type.toUpperCase()];
      channel.parent_id = channel.parentID;
      delete channel.parentID;
      if (!channel.permissionOverwrites) continue;
      for (const overwrite of channel.permissionOverwrites) {
        if (overwrite.allow) overwrite.allow = Permissions.resolve(overwrite.allow);
        if (overwrite.deny) overwrite.deny = Permissions.resolve(overwrite.deny);
      }
      channel.permission_overwrites = channel.permissionOverwrites;
      delete channel.permissionOverwrites;
    }
    for (const role of roles) {
      if (role.color) role.color = resolveColor(role.color);
      if (role.permissions) role.permissions = Permissions.resolve(role.permissions);
    }
    return new Promise((resolve, reject) =>
      this.client.api.guilds
        .post({
          data: {
            name,
            region,
            icon,
            verification_level: verificationLevel,
            default_message_notifications: defaultMessageNotifications,
            explicit_content_filter: explicitContentFilter,
            roles,
            channels,
            afk_channel_id: afkChannelID,
            afk_timeout: afkTimeout,
            system_channel_id: systemChannelID,
          },
        })
        .then((data) => {
          if (this.client.guilds.cache.has(data.id)) return resolve(this.client.guilds.cache.get(data.id));

          const handleGuild = (guild) => {
            if (guild.id === data.id) {
              this.client.clearTimeout(timeout);
              this.client.removeListener(Events.GUILD_CREATE, handleGuild);
              this.client.decrementMaxListeners();
              resolve(guild);
            }
          };
          this.client.incrementMaxListeners();
          this.client.on(Events.GUILD_CREATE, handleGuild);

          const timeout = this.client.setTimeout(() => {
            this.client.removeListener(Events.GUILD_CREATE, handleGuild);
            this.client.decrementMaxListeners();
            resolve(this.client.guilds.add(data));
          }, 10000);
          return undefined;
        }, reject)
    );
  }

  async fetch(id: string, cache = true, force = false) {
    if (!force) {
      const existing = this.cache.get(id);
      if (existing) return existing;
    }

    // @ts-ignore should wokr
    const data = await this.client.api.guilds(id).get({ query: { with_counts: true } });
    return this.add(data, cache);
  }
}

export default GuildManager;
