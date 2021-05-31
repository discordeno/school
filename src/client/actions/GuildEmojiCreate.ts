import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class GuildEmojiCreateAction extends Action {
  // @ts-ignore
  handle(guild, createdEmoji) {
    const already = guild.emojis.cache.has(createdEmoji.id);
    const emoji = guild.emojis.add(createdEmoji);

    if (!already) this.client.emit(Events.GUILD_EMOJI_CREATE, emoji);
    return { emoji };
  }
}

export default GuildEmojiCreateAction;
