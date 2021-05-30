import MessageCreate from "./MessageCreate.ts";
import MessageDelete from "./MessageDelete.ts";
import MessageDeleteBulk from "./MessageDeleteBulk.ts";
import MessageUpdate from "./MessageUpdate.ts";
import MessageReactionAdd from "./MessageReactionAdd.ts";
import MessageReactionRemove from "./MessageReactionRemove.ts";
import MessageReactionRemoveAll from "./MessageReactionRemoveAll.ts";
import MessageReactionRemoveEmoji from "./MessageReactionRemoveEmoji.ts";
import ChannelCreate from "./ChannelCreate.ts";
import ChannelDelete from "./ChannelDelete.ts";
import ChannelUpdate from "./ChannelUpdate.ts";
import GuildDelete from "./GuildDelete.ts";
import GuildUpdate from "./GuildUpdate.ts";
import InviteCreate from "./InviteCreate.ts";
import InviteDelete from "./InviteDelete.ts";
import GuildMemberRemove from "./GuildMemberRemove.ts";
import GuildMemberUpdate from "./GuildMemberUpdate.ts";
import GuildBanRemove from "./GuildBanRemove.ts";
import GuildRoleCreate from "./GuildRoleCreate.ts";
import GuildRoleDelete from "./GuildRoleDelete.ts";
import GuildRoleUpdate from "./GuildRoleUpdate.ts";
import PresenceUpdate from "./PresenceUpdate.ts";
import UserUpdate from "./UserUpdate.ts";
import VoiceStateUpdate from "./VoiceStateUpdate.ts";
import GuildEmojiCreate from "./GuildEmojiCreate.ts";
import GuildEmojiDelete from "./GuildEmojiDelete.ts";
import GuildEmojiUpdate from "./GuildEmojiUpdate.ts";
import GuildEmojisUpdate from "./GuildEmojisUpdate.ts";
import GuildRolesPositionUpdate from "./GuildRolesPositionUpdate.ts";
import GuildChannelsPositionUpdate from "./GuildChannelsPositionUpdate.ts";
import GuildIntegrationsUpdate from "./GuildIntegrationsUpdate.ts";
import WebhooksUpdate from "./WebhooksUpdate.ts";
import TypingStart from "./TypingStart.ts";
import Client from "../Client.ts";

export class ActionsManager {
  client: Client;

  // deno-lint-ignore no-explicit-any
  [key: string]: any;

  constructor(client: Client) {
    this.client = client;

    this.register(MessageCreate);
    this.register(MessageDelete);
    this.register(MessageDeleteBulk);
    this.register(MessageUpdate);
    this.register(MessageReactionAdd);
    this.register(MessageReactionRemove);
    this.register(MessageReactionRemoveAll);
    this.register(MessageReactionRemoveEmoji);
    this.register(ChannelCreate);
    this.register(ChannelDelete);
    this.register(ChannelUpdate);
    this.register(GuildDelete);
    this.register(GuildUpdate);
    this.register(InviteCreate);
    this.register(InviteDelete);
    this.register(GuildMemberRemove);
    this.register(GuildMemberUpdate);
    this.register(GuildBanRemove);
    this.register(GuildRoleCreate);
    this.register(GuildRoleDelete);
    this.register(GuildRoleUpdate);
    this.register(PresenceUpdate);
    this.register(UserUpdate);
    this.register(VoiceStateUpdate);
    this.register(GuildEmojiCreate);
    this.register(GuildEmojiDelete);
    this.register(GuildEmojiUpdate);
    this.register(GuildEmojisUpdate);
    this.register(GuildRolesPositionUpdate);
    this.register(GuildChannelsPositionUpdate);
    this.register(GuildIntegrationsUpdate);
    this.register(WebhooksUpdate);
    this.register(TypingStart);
  }

  // deno-lint-ignore no-explicit-any
  register(Action: any) {
    this[Action.name.replace(/Action$/, "")] = new Action(this.client);
  }
}

export default ActionsManager;
