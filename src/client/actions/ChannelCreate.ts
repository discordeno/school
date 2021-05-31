import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class ChannelCreateAction extends Action {
  // deno-lint-ignore no-explicit-any
  handle(data: any) {
    const client = this.client;
    const existing = client.channels.cache.has(data.id);
    const channel = client.channels.add(data);
    if (!existing && channel) {
      client.emit(Events.CHANNEL_CREATE, channel);
    }
    return { channel };
  }
}

export default ChannelCreateAction;
