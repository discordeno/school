import GuildEmoji from "../structures/GuildEmoji.ts";
import DMChannel from "../structures/DMChannel.ts";
import TextChannel from "../structures/TextChannel.ts";
import VoiceChannel from "../structures/VoiceChannel.ts";
import CategoryChannel from "../structures/CategoryChannel.ts";
import NewsChannel from "../structures/NewsChannel.ts";
import StoreChannel from "../structures/StoreChannel.ts";
import StageChannel from "../structures/StageChannel.ts";
import GuildMember from "../structures/GuildMember.ts";
import Guild from "../structures/Guild.ts";
import Message from "../structures/Message.ts";
import MessageReaction from "../structures/MessageReaction.ts";
import { Presence } from "../structures/Presence..ts";
import ClientPresence from "../structures/ClientPresence.ts";
import VoiceState from "../structures/VoiceState.ts";
import Role from "../structures/Role.ts";
import User from "../structures/User.ts";
import CommandInteraction from "../structures/CommandInteraction.ts";

const structures = {
  GuildEmoji,
  DMChannel,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  NewsChannel,
  StoreChannel,
  StageChannel,
  GuildMember,
  Guild,
  Message,
  MessageReaction,
  Presence,
  ClientPresence,
  VoiceState,
  Role,
  User,
  CommandInteraction,
};

export function get(structure: keyof typeof structures) {
  if (typeof structure === "string") return structures[structure];
  throw new TypeError(`"structure" argument must be a string (received ${typeof structure})`);
}

export function extend(structure: keyof typeof structures, extender: Function) {
  const extended = extender(structures[structure]);
  if (typeof extended !== "function") {
    const received = `(received ${typeof extended})`;
    throw new TypeError(`The extender function must return the extended structure class/prototype ${received}.`);
  }

  if (!(extended.prototype instanceof structures[structure])) {
    const prototype = Object.getPrototypeOf(extended);
    const received = `${extended.name || "unnamed"}${prototype.name ? ` extends ${prototype.name}` : ""}`;
    throw new Error(
      "The class/prototype returned from the extender function must extend the existing structure class/prototype" +
        ` (received function ${received}; expected extension of ${structures[structure].name}).`
    );
  }

  structures[structure] = extended;
  return extended;
}

export default {
  get,
  extend,
};
