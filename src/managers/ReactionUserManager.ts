import BaseManager from "./BaseManager.ts";
import { DJSError } from "../errors/mod.ts";
import Collection from "../util/Collection.ts";

export class ReactionUserManager extends BaseManager<string | Snowflake, MessageReaction, MessageReactionResolvable> {
  reaction: MessageReaction;

  constructor(client, iterable, reaction) {
    super(client, iterable, { name: "User" });

    this.reaction = reaction;
  }

  async fetch({ limit = 100, after, before } = {}) {
    const message = this.reaction.message;
    const data = await this.client.api.channels[message.channel.id].messages[message.id].reactions[
      this.reaction.emoji.identifier
    ].get({ query: { limit, before, after } });
    const users = new Collection();
    for (const rawUser of data) {
      const user = this.client.users.add(rawUser);
      this.cache.set(user.id, user);
      users.set(user.id, user);
    }
    return users;
  }

  remove(user: UserResolvable = this.client.user) {
    const userID = this.client.users.resolveID(user);
    if (!userID) return Promise.reject(new DJSError.Error("REACTION_RESOLVE_USER"));
    const message = this.reaction.message;
    return this.client.api.channels[message.channel.id].messages[message.id].reactions[this.reaction.emoji.identifier][
      userID === this.client.user.id ? "@me" : userID
    ]
      .delete()
      .then(() => this.reaction);
  }
}

export default ReactionUserManager;
