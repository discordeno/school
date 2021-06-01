import { RoleResolvable, Snowflake } from "../../typings/mod.ts";
import Client from "../client/Client.ts";
import { DJSError } from "../errors/mod.ts";
import Collection from "../util/Collection.ts";

export class GuildEmojiRoleManager {
  emoji: GuildEmoji;
  guild: Guild;
  client: Client;

  constructor(emoji: GuildEmoji) {
    this.emoji = emoji;
    this.guild = emoji.guild;
    this.client = emoji.client;
  }

  get _roles() {
    return this.guild.roles.cache.filter((role) => this.emoji._roles.includes(role.id));
  }

  get cache() {
    return this._roles;
  }

  add(roleOrRoles: RoleResolvable | RoleResolvable[] | Collection<Snowflake, Role>) {
    if (roleOrRoles instanceof Collection) return this.add(roleOrRoles.keyArray());
    if (!Array.isArray(roleOrRoles)) return this.add([roleOrRoles]);
    roleOrRoles = roleOrRoles.map((r) => this.guild.roles.resolve(r));

    if (roleOrRoles.includes(null)) {
      return Promise.reject(
        new DJSError.TypeError("INVALID_TYPE", "roles", "Array or Collection of Roles or Snowflakes", true)
      );
    }

    const newRoles = [...new Set(roleOrRoles.concat(...this._roles.values()))];
    return this.set(newRoles);
  }

  remove(roleOrRoles: RoleResolvable | RoleResolvable[] | Collection<Snowflake, Role>) {
    if (roleOrRoles instanceof Collection) return this.remove(roleOrRoles.keyArray());
    if (!Array.isArray(roleOrRoles)) return this.remove([roleOrRoles]);
    roleOrRoles = roleOrRoles.map((r) => this.guild.roles.resolveID(r));

    if (roleOrRoles.includes(null)) {
      return Promise.reject(
        new DJSError.TypeError("INVALID_TYPE", "roles", "Array or Collection of Roles or Snowflakes", true)
      );
    }

    const newRoles = this._roles.keyArray().filter((role) => !roleOrRoles.includes(role));
    return this.set(newRoles);
  }

  
  set(roles: Collection<Snowflake, Role> | RoleResolvable[]) {
    return this.emoji.edit({ roles });
  }

  clone() {
    const clone = new this.constructor(this.emoji);
    clone._patch(this._roles.keyArray().slice());
    return clone;
  }

  _patch(roles: Snowflake[]) {
    this.emoji._roles = roles;
  }
}

export default GuildEmojiRoleManager;
