import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class GuildEmojiUpdateAction extends Action {
  handle(current: any, data: any) {
    const old = current._update(data);

    this.client.emit(Events.GUILD_EMOJI_UPDATE, old, current);
    return { emoji: current };
  }
}

export default GuildEmojiUpdateAction;
