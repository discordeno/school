import BaseManager from "./BaseManager.ts";
const MessageReaction = require("../structures/MessageReaction");

export class ReactionManager extends BaseManager<string | Snowflake, MessageReaction, MessageReactionResolvable> {
  message: Message;
  constructor(message: Message, iterable?: Iterable<MessageReaction>) {
    super(message.client, iterable, MessageReaction);

    this.message = message;
  }

  add(data, cache) {
    return super.add(data, cache, { id: data.emoji.id || data.emoji.name, extras: [this.message] });
  }

  removeAll() {
    return this.client.api
      .channels(this.message.channel.id)
      .messages(this.message.id)
      .reactions.delete()
      .then(() => this.message);
  }
}

export default ReactionManager;
