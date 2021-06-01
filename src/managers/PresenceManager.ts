import BaseManager from "./BaseManager.ts";
import { Presence } from "../structures/Presence.ts";

export class PresenceManager extends BaseManager<Snowflake, Presence, PresenceResolvable> {
  constructor(client: Client, iterable?: Iterable<any>) {
    super(client, iterable, Presence);
  }


  add(data, cache) {
    const existing = this.cache.get(data.user.id);
    return existing ? existing.patch(data) : super.add(data, cache, { id: data.user.id });
  }

  resolve(presence: PresenceResolvable) {
    const presenceResolvable = super.resolve(presence);
    if (presenceResolvable) return presenceResolvable;
    const UserResolvable = this.client.users.resolveID(presence);
    return super.resolve(UserResolvable) || null;
  }

  resolveID(presence: PresenceResolvable) {
    const presenceResolvable = super.resolveID(presence);
    if (presenceResolvable) return presenceResolvable;
    const userResolvable = this.client.users.resolveID(presence);
    return this.cache.has(userResolvable) ? userResolvable : null;
  }
}

export default PresenceManager;
