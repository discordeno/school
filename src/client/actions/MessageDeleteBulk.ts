import Action from "./Action.ts";
import Collection from "../../util/Collection.ts";
import { Events } from "../../util/Constants.ts";

export class MessageDeleteBulkAction extends Action {
  handle(data: any) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);

    if (channel) {
      const ids = data.ids;
      const messages = new Collection();
      for (const id of ids) {
        const message = this.getMessage(
          {
            id,
            guild_id: data.guild_id,
          },
          channel,
          false
        );
        if (message) {
          message.deleted = true;
          messages.set(message.id, message);
          channel.messages.cache.delete(id);
        }
      }

      if (messages.size > 0) client.emit(Events.MESSAGE_BULK_DELETE, messages);
      return { messages };
    }
    return {};
  }
}

export default MessageDeleteBulkAction;
