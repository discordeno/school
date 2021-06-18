import BaseGuildEmoji from "./BaseGuildEmoji.ts";
import { DJSError } from "../errors/mod.ts";
import GuildEmojiRoleManager from "../managers/GuildEmojiRoleManager.ts";
import Permissions from "../util/Permissions.ts";
import { GuildEmojiEditData } from "../../typings/mod.ts";
import Client from "../client/Client.ts";
import { Guild } from "./Guild.ts";
import User from "./User.ts";

export class GuildEmoji extends BaseGuildEmoji {
  author: User | null;

  constructor(client: Client, data: any, guild: Guild) {
    super(client, data, guild);

    this.author = null;
  }

  _clone() {
    const clone = super._clone();
    clone._roles = this._roles.slice();
    return clone;
  }

  _patch(data) {
    super._patch(data);
    if (typeof data.user !== "undefined") this.author = this.client.users.add(data.user);
  }

  get deletable() {
    if (!this.guild.me) throw new DJSError.Error("GUILD_UNCACHED_ME");
    // @ts-ignore
    return !this.managed && this.guild.me.hasPermission(Permissions.FLAGS.MANAGE_EMOJIS);
  }

  get roles() {
    return new GuildEmojiRoleManager(this);
  }

  async fetchAuthor() {
    if (this.managed) {
      throw new DJSError.Error("EMOJI_MANAGED");
    } else {
      if (!this.guild.me) throw new DJSError.Error("GUILD_UNCACHED_ME");
      if (!this.guild.me.permissions.has(Permissions.FLAGS.MANAGE_EMOJIS)) {
        throw new DJSError.Error("MISSING_MANAGE_EMOJIS_PERMISSION", this.guild);
      }
    }
    const data = await this.client.api.guilds(this.guild.id).emojis(this.id).get();
    this._patch(data);
    return this.author;
  }

  edit(data: GuildEmojiEditData, reason?: string) {
    const roles = data.roles ? data.roles.map((r) => r.id || r) : undefined;
    return this.client.api
      .guilds(this.guild.id)
      .emojis(this.id)
      .patch({
        data: {
          name: data.name,
          roles,
        },
        reason,
      })
      .then((newData) => {
        const clone = this._clone();
        clone._patch(newData);
        return clone;
      });
  }

  setName(name: string, reason?: string) {
    return this.edit({ name }, reason);
  }

  delete(reason?: string) {
    return this.client.api
      .guilds(this.guild.id)
      .emojis(this.id)
      .delete({ reason })
      .then(() => this);
  }

  equals(other: any) {
    if (other instanceof GuildEmoji) {
      return (
        other.id === this.id &&
        other.name === this.name &&
        other.managed === this.managed &&
        other.requiresColons === this.requiresColons &&
        other.roles.cache.size === this.roles.cache.size &&
        other.roles.cache.every((role) => this.roles.cache.has(role.id))
      );
    } else {
      return (
        other.id === this.id &&
        other.name === this.name &&
        other.roles.length === this.roles.cache.size &&
        other.roles.every((role) => this.roles.cache.has(role))
      );
    }
  }
}

export default GuildEmoji;
