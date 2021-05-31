import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

const textBasedChannelTypes = ["dm", "text", "news.ts"];

export class TypingStart extends Action {
  handle(data: any) {
    const channel = this.getChannel(data);
    if (!channel) {
      return;
    }
    if (!textBasedChannelTypes.includes(channel.type)) {
      this.client.emit(Events.WARN, `Discord sent a typing packet to a ${channel.type} channel ${channel.id}`);
      return;
    }

    const user = this.getUserFromMember(data);
    const timestamp = new Date(data.timestamp * 1000);

    if (channel && user) {
      if (channel._typing.has(user.id)) {
        const typing = channel._typing.get(user.id);

        typing.lastTimestamp = timestamp;
        typing.elapsedTime = Date.now() - typing.since;
        this.client.clearTimeout(typing.timeout);
        typing.timeout = this.tooLate(channel, user);
      } else {
        const since = new Date();
        const lastTimestamp = new Date();
        channel._typing.set(user.id, {
          user,
          since,
          lastTimestamp,
          // @ts-ignore huh?
          elapsedTime: Date.now() - since,
          timeout: this.tooLate(channel, user),
        });

        this.client.emit(Events.TYPING_START, channel, user);
      }
    }
  }

  tooLate(channel: any, user: any) {
    return channel.client.setTimeout(() => {
      channel._typing.delete(user.id);
    }, 10000);
  }
}

export default TypingStart;
