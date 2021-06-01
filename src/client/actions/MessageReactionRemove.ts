import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class MessageReactionRemove extends Action {
  handle(data: any) {
    if (!data.emoji) return false;

    const user = this.getUser(data);
    if (!user) return false;

    const channel = this.getChannel(data);
    if (!channel || channel.type === "voice") return false;

    const message = this.getMessage(data, channel);
    if (!message) return false;

    const reaction = this.getReaction(data, message, user);
    if (!reaction) return false;
    reaction._remove(user);
    this.client.emit(Events.MESSAGE_REACTION_REMOVE, reaction, user);

    return { message, reaction, user };
  }
}

export default MessageReactionRemove;
