import BaseManager from "./BaseManager.ts";
import Role from "../structures/Role.ts";
import Permissions from "../util/Permissions.ts";
import { resolveColor } from "../util/Util.ts";

export class RoleManager extends BaseManager<Snowflake, Role, RoleResolvable> {
  guild: Guild;

  constructor(guild: Guild, iterable?: Iterable<Role>) {
    super(guild.client, iterable, Role);
    this.guild = guild;
  }

  add(data, cache) {
    return super.add(data, cache, { extras: [this.guild] });
  }

  async fetch(id, cache = true, force = false) {
    if (id && !force) {
      const existing = this.cache.get(id);
      if (existing) return existing;
    }

    const roles = await this.client.api.guilds(this.guild.id).roles.get();
    for (const role of roles) this.add(role, cache);
    return id ? this.cache.get(id) || null : this;
  }

  create({ data = {}, reason } = {}) {
    if (data.color) data.color = resolveColor(data.color);
    if (data.permissions) data.permissions = Permissions.resolve(data.permissions);

    return this.guild.client.api
      .guilds(this.guild.id)
      .roles.post({ data, reason })
      .then((r) => {
        const { role } = this.client.actions.GuildRoleCreate.handle({
          guild_id: this.guild.id,
          role: r,
        });
        if (data.position) return role.setPosition(data.position, reason);
        return role;
      });
  }

  get everyone() {
    return this.cache.get(this.guild.id);
  }

  get highest() {
    return this.cache.reduce((prev, role) => (role.comparePositionTo(prev) > 0 ? role : prev), this.cache.first());
  }
}

export default RoleManager;
