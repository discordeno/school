import BaseManager from "./BaseManager.ts";
import { DJSError } from "../errors/mod.ts";
import GuildMember from "../structures/GuildMember.ts";
import Collection from "../util/Collection.ts";
import { Events, OPCodes } from "../util/Constants.ts";
import SnowflakeUtil from "../util/Snowflake.ts";
import { GuildMemberResolvable, Snowflake } from "../../typings/mod.ts";

class GuildMemberManager extends BaseManager<Snowflake, GuildMember, GuildMemberResolvable> {
  guild: Guild;

  constructor(guild: Guild, iterable: Iterable<GuildMember>) {
    super(guild.client, iterable, GuildMember);
    this.guild = guild;
  }

  add(data: { user: { id: any } }, cache = true) {
    return super.add(data, cache, { id: data.user.id, extras: [this.guild] });
  }

  resolve(member: GuildMemberResolvable) {
    const memberResolvable = super.resolve(member);
    if (memberResolvable) return memberResolvable;
    const userResolvable = this.client.users.resolveID(member);
    if (userResolvable) return super.resolve(userResolvable);
    return null;
  }

  resolveID(member: GuildMemberResolvable) {
    const memberResolvable = super.resolveID(member);
    if (memberResolvable) return memberResolvable;
    const userResolvable = this.client.users.resolveID(member);
    return this.cache.has(userResolvable) ? userResolvable : null;
  }

  fetch(
    options:
      | {
          limit?: number | undefined;
          withPresences?: boolean | undefined;
          user: any;
          query: any;
          time?: number | undefined;
          nonce?: string | undefined;
          force?: boolean | undefined;
        }
      | undefined
  ) {
    if (!options) return this._fetchMany();
    const user = this.client.users.resolveID(options);
    if (user) return this._fetchSingle({ user, cache: true });
    if (options.user) {
      if (Array.isArray(options.user)) {
        options.user = options.user.map((u: any) => this.client.users.resolveID(u));
        return this._fetchMany(options);
      } else {
        options.user = this.client.users.resolveID(options.user);
      }
      if (!options.limit && !options.withPresences) return this._fetchSingle(options);
    }
    return this._fetchMany(options);
  }

  prune({ days = 7, dry = false, count: compute_prune_count = true, roles = [], reason } = {}) {
    if (typeof days !== "number") throw new DJSError.TypeError("PRUNE_DAYS_TYPE");

    const query = { days };
    const resolvedRoles = [];

    for (const role of roles) {
      const resolvedRole = this.guild.roles.resolveID(role);
      if (!resolvedRole) {
        return Promise.reject(new DJSError.TypeError("INVALID_TYPE", "roles", "Array of Roles or Snowflakes", true));
      }
      resolvedRoles.push(resolvedRole);
    }

    if (resolvedRoles.length) {
      query.include_roles = dry ? resolvedRoles.join(",") : resolvedRoles;
    }

    const endpoint = this.client.api.guilds(this.guild.id).prune;

    if (dry) {
      return endpoint.get({ query, reason }).then((data: { pruned: any }) => data.pruned);
    }

    return endpoint
      .post({
        data: { ...query, compute_prune_count },
        reason,
      })
      .then((data: { pruned: any }) => data.pruned);
  }

  ban(user: any, options = { days: 0 }) {
    if (options.days) options.delete_message_days = options.days;
    const id = this.client.users.resolveID(user);
    if (!id) return Promise.reject(new DJSError.Error("BAN_RESOLVE_ID", true));
    return this.client.api
      .guilds(this.guild.id)
      .bans[id].put({ data: options })
      .then(() => {
        if (user instanceof GuildMember) return user;
        const _user = this.client.users.resolve(id);
        if (_user) {
          const member = this.resolve(_user);
          return member || _user;
        }
        return id;
      });
  }

  unban(user: any, reason: any) {
    const id = this.client.users.resolveID(user);
    if (!id) return Promise.reject(new DJSError.Error("BAN_RESOLVE_ID"));
    return this.client.api
      .guilds(this.guild.id)
      .bans[id].delete({ reason })
      .then(() => this.client.users.resolve(user));
  }

  _fetchSingle({ user, cache, force = false }) {
    if (!force) {
      const existing = this.cache.get(user);
      if (existing && !existing.partial) return Promise.resolve(existing);
    }

    return this.client.api
      .guilds(this.guild.id)
      .members(user)
      .get()
      .then((data: any) => this.add(data, cache));
  }

  _fetchMany({
    limit = 0,
    withPresences: presences = false,
    user: user_ids,
    query,
    time = 120e3,
    nonce = SnowflakeUtil.generate(),
    force = false,
  } = {}) {
    return new Promise((resolve, reject) => {
      if (this.guild.memberCount === this.cache.size && !query && !limit && !presences && !user_ids && !force) {
        resolve(this.cache);
        return;
      }
      if (!query && !user_ids) query = "";
      if (nonce.length > 32) throw new DJSError.RangeError("MEMBER_FETCH_NONCE_LENGTH");
      this.guild.shard.send({
        op: OPCodes.REQUEST_GUILD_MEMBERS,
        d: {
          guild_id: this.guild.id,
          presences,
          user_ids,
          query,
          nonce,
          limit,
        },
      });
      const fetchedMembers = new Collection();
      const option = query || limit || presences || user_ids;
      let i = 0;
      const handler = (
        members: { values: () => any; size: number },
        _: any,
        chunk: { nonce: string; count: number }
      ) => {
        timeout.refresh();
        if (chunk.nonce !== nonce) return;
        i++;
        for (const member of members.values()) {
          if (option) fetchedMembers.set(member.id, member);
        }
        if (
          this.guild.memberCount <= this.cache.size ||
          (option && members.size < 1000) ||
          (limit && fetchedMembers.size >= limit) ||
          i === chunk.count
        ) {
          this.client.clearTimeout(timeout);
          this.client.removeListener(Events.GUILD_MEMBERS_CHUNK, handler);
          this.client.decrementMaxListeners();
          let fetched = option ? fetchedMembers : this.cache;
          if (user_ids && !Array.isArray(user_ids) && fetched.size) fetched = fetched.first();
          resolve(fetched);
        }
      };
      const timeout = this.client.setTimeout(() => {
        this.client.removeListener(Events.GUILD_MEMBERS_CHUNK, handler);
        this.client.decrementMaxListeners();
        reject(new DJSError.Error("GUILD_MEMBERS_TIMEOUT"));
      }, time);
      this.client.incrementMaxListeners();
      this.client.on(Events.GUILD_MEMBERS_CHUNK, handler);
    });
  }
}

export default GuildMemberManager;
