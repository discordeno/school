import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class MessageDeleteAction extends Action {
  handle(data: any) {
    const client = this.client;
    const channel = this.getChannel(data);
    let message;
    if (channel) {
      message = this.getMessage(data, channel);
      if (message) {
        channel.messages.cache.delete(message.id);
        message.deleted = true;
        client.emit(Events.MESSAGE_DELETE, message);
      }
    }

    return { message };
  }
}

export default MessageDeleteAction;
