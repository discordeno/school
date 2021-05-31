import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

class MessageReactionRemoveAll extends Action {
  handle(data: any) {
    const channel = this.getChannel(data);
    if (!channel || channel.type === "voice") return false;

    const message = this.getMessage(data, channel);
    if (!message) return false;

    message.reactions.cache.clear();
    this.client.emit(Events.MESSAGE_REACTION_REMOVE_ALL, message);

    return { message };
  }
}

export default MessageReactionRemoveAll;
