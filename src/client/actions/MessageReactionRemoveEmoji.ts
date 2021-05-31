import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class MessageReactionRemoveEmoji extends Action {
  handle(data: any) {
    const channel = this.getChannel(data);
    if (!channel || channel.type === "voice") return false;

    const message = this.getMessage(data, channel);
    if (!message) return false;

    const reaction = this.getReaction(data, message);
    if (!reaction) return false;
    if (!message.partial) message.reactions.cache.delete(reaction.emoji.id || reaction.emoji.name);

    this.client.emit(Events.MESSAGE_REACTION_REMOVE_EMOJI, reaction);
    return { reaction };
  }
}

export default MessageReactionRemoveEmoji;
