import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class GuildEmojiDeleteAction extends Action {
  handle(emoji: any) {
    emoji.guild.emojis.cache.delete(emoji.id);
    emoji.deleted = true;

    this.client.emit(Events.GUILD_EMOJI_DELETE, emoji);
    return { emoji };
  }
}

export default GuildEmojiDeleteAction;
