import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class MessageCreateAction extends Action {
  handle(data: any) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);
    if (channel) {
      const existing = channel.messages.cache.get(data.id);
      if (existing) return { message: existing };
      const message = channel.messages.add(data);
      const user = message.author;
      let member = message.member;
      channel.lastMessageID = data.id;
      if (user) {
        user.lastMessageID = data.id;
        user.lastMessageChannelID = channel.id;
      }
      if (member) {
        member.lastMessageID = data.id;
        member.lastMessageChannelID = channel.id;
      }

      client.emit(Events.MESSAGE_CREATE, message);
      return { message };
    }

    return {};
  }
}

export default MessageCreateAction;
