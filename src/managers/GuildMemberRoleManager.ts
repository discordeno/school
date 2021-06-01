import { DJSError } from "../errors/mod.ts";
import Collection from "../util/Collection.ts";

export class GuildMemberRoleManager {
  member: GuildMember;
  guild: Guild;
  client: Client;

  constructor(member: GuildMember) {
    this.member = member;
    this.guild = member.guild;
    this.client = member.client;
  }

  get _roles() {
    const everyone = this.guild.roles.everyone;
    return this.guild.roles.cache.filter((role) => this.member._roles.includes(role.id)).set(everyone.id, everyone);
  }

  get cache() {
    return this._roles;
  }

  get hoist() {
    const hoistedRoles = this._roles.filter((role) => role.hoist);
    if (!hoistedRoles.size) return null;
    return hoistedRoles.reduce((prev, role) => (!prev || role.comparePositionTo(prev) > 0 ? role : prev));
  }

  get color() {
    const coloredRoles = this._roles.filter((role) => role.color);
    if (!coloredRoles.size) return null;
    return coloredRoles.reduce((prev, role) => (!prev || role.comparePositionTo(prev) > 0 ? role : prev));
  }

  get highest() {
    return this._roles.reduce((prev, role) => (role.comparePositionTo(prev) > 0 ? role : prev), this._roles.first());
  }

  async add(roleOrRoles: RoleResolvable | RoleResolvable[] | Collection<Snowflake, Role>, reason?: string) {
    if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
      roleOrRoles = roleOrRoles.map((r) => this.guild.roles.resolve(r));
      if (roleOrRoles.includes(null)) {
        throw new DJSError.TypeError("INVALID_TYPE", "roles", "Array or Collection of Roles or Snowflakes", true);
      }

      const newRoles = [...new Set(roleOrRoles.concat(...this._roles.values()))];
      return this.set(newRoles, reason);
    } else {
      roleOrRoles = this.guild.roles.resolve(roleOrRoles);
      if (roleOrRoles === null) {
        throw new DJSError.TypeError(
          "INVALID_TYPE",
          "roles",
          "Role, Snowflake or Array or Collection of Roles or Snowflakes"
        );
      }

      await this.client.api.guilds[this.guild.id].members[this.member.id].roles[roleOrRoles.id].put({ reason });

      const clone = this.member._clone();
      clone._roles = [...this._roles.keys(), roleOrRoles.id];
      return clone;
    }
  }

  async remove(roleOrRoles: RoleResolvable | RoleResolvable[] | Collection<Snowflake, Role>, reason?: string) {
    if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
      roleOrRoles = roleOrRoles.map((r) => this.guild.roles.resolve(r));
      if (roleOrRoles.includes(null)) {
        throw new DJSError.TypeError("INVALID_TYPE", "roles", "Array or Collection of Roles or Snowflakes", true);
      }

      const newRoles = this._roles.filter((role) => !roleOrRoles.includes(role));
      return this.set(newRoles, reason);
    } else {
      roleOrRoles = this.guild.roles.resolve(roleOrRoles);
      if (roleOrRoles === null) {
        throw new DJSError.TypeError("INVALID_TYPE", "roles", "Array or Collection of Roles or Snowflakes", true);
      }

      await this.client.api.guilds[this.guild.id].members[this.member.id].roles[roleOrRoles.id].delete({ reason });

      const clone = this.member._clone();
      const newRoles = this._roles.filter((role) => role.id !== roleOrRoles.id);
      clone._roles = [...newRoles.keys()];
      return clone;
    }
  }

  set(roles: Collection<Snowflake, Role> | RoleResolvable[], reason?: string) {
    return this.member.edit({ roles }, reason);
  }

  clone() {
    const clone = new this.constructor(this.member);
    clone.member._roles = [...this._roles.keyArray()];
    return clone;
  }
}

export default GuildMemberRoleManager;
