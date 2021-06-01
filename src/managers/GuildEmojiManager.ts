import BaseManager from "./BaseManager.ts";
import { DJSError } from "../errors/mod.ts";
import GuildEmoji from "../structures/GuildEmoji.ts";
import ReactionEmoji from "../structures/ReactionEmoji.ts";
import Collection from "../util/Collection.ts";
import DataResolver from "../util/DataResolver.ts";
import { parseEmoji } from "../util/Util.ts";
import { EmojiResolvable, Snowflake } from "../../typings/mod.ts";

export class GuildEmojiManager extends BaseManager<Snowflake, GuildEmoji, EmojiResolvable> {
  guild: Guild;

  constructor(guild: Guild, iterable: Iterable<GuildEmoji>) {
    super(guild.client, iterable, GuildEmoji);

    this.guild = guild;
  }

  add(data: GuildEmoji, cache: boolean) {
    return super.add(data, cache, { extras: [this.guild] });
  }

  async create(attachment: any, name: any, { roles, reason }: any = {}) {
    attachment = await DataResolver.resolveImage(attachment);
    if (!attachment) throw new DJSError.TypeError("REQ_RESOURCE_TYPE");

    const data = { image: attachment, name };
    if (roles) {
      // @ts-ignore okay
      data.roles = [];
      for (let role of roles instanceof Collection ? roles.values() : roles) {
        role = this.guild.roles.resolve(role);
        if (!role) {
          return Promise.reject(
            new DJSError.TypeError("INVALID_TYPE", "options.roles", "Array or Collection of Roles or Snowflakes", true)
          );
        }
        // @ts-ignore okay
        data.roles.push(role.id);
      }
    }

    return (
      this.client.api
        // @ts-ignore okay
        .guilds(this.guild.id)
        .emojis.post({ data, reason })
        .then((emoji: any) => this.client.actions.GuildEmojiCreate.handle(this.guild, emoji).emoji)
    );
  }

  resolve(emoji: { id: any }) {
    if (emoji instanceof ReactionEmoji) return super.resolve(emoji.id);
    return super.resolve(emoji);
  }

  resolveID(emoji: { id: any }) {
    if (emoji instanceof ReactionEmoji) return emoji.id;
    return super.resolveID(emoji);
  }

  
  resolveIdentifier(emoji: any) {
    const emojiResolvable = this.resolve(emoji);
    if (emojiResolvable) return emojiResolvable.identifier;
    if (emoji instanceof ReactionEmoji) return emoji.identifier;
    if (typeof emoji === "string") {
      const res = parseEmoji(emoji);
      if (res && res.name.length) {
        emoji = `${res.animated ? "a:" : ""}${res.name}${res.id ? `:${res.id}` : ""}`;
      }
      if (!emoji.includes("%")) return encodeURIComponent(emoji);
      else return emoji;
    }
    return null;
  }
}

export default GuildEmojiManager;
