import BaseManager from "./BaseManager.ts";
import GuildMember from "../structures/GuildMember.ts";
import Message from "../structures/Message.ts";
import User from "../structures/User.ts";

export class UserManager extends BaseManager<Snowflake, User, UserResolvable> {
  constructor(client: Client, iterable?: Iterable<User>) {
    super(client, iterable, User);
  }

 
  resolve(user: UserResolvable) {
    if (user instanceof GuildMember) return user.user;
    if (user instanceof Message) return user.author;
    return super.resolve(user);
  }

  resolveID(user: UserResolvable) {
    if (user instanceof GuildMember) return user.user.id;
    if (user instanceof Message) return user.author.id;
    return super.resolveID(user);
  }

  async fetch(id: string, cache = true, force = false) {
    if (!force) {
      const existing = this.cache.get(id);
      if (existing && !existing.partial) return existing;
    }

    const data = await this.client.api.users(id).get();
    return this.add(data, cache);
  }
}

export default UserManager;
