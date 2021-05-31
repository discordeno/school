import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";
import { PartialTypes } from "../../util/Constants.ts";

class MessageReactionAdd extends Action {
  handle(data: any) {
    if (!data.emoji) return false;

    const user = this.getUserFromMember(data);
    if (!user) return false;

    const channel = this.getChannel(data);
    if (!channel || channel.type === "voice") return false;

    const message = this.getMessage(data, channel);
    if (!message) return false;

    if (message.partial && !this.client.options.partials.includes(PartialTypes.REACTION)) return false;
    const existing = message.reactions.cache.get(data.emoji.id || data.emoji.name);
    if (existing && existing.users.cache.has(user.id)) return { message, reaction: existing, user };
    const reaction = message.reactions.add({
      emoji: data.emoji,
      count: message.partial ? null : 0,
      me: user.id === this.client.user!.id,
    });
    if (!reaction) return false;
    reaction._add(user);
    this.client.emit(Events.MESSAGE_REACTION_ADD, reaction, user);

    return { message, reaction, user };
  }
}

export default MessageReactionAdd;
