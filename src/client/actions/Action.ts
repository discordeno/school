import { PartialTypes } from "../../util/Constants.ts";
import Client from "../Client.ts";

/*
ABOUT ACTIONS
Actions are similar to WebSocket Packet Handlers, but since introducing
the REST API methods, in order to prevent rewriting code to handle data,
"actions" have been introduced. They're basically what Packet Handlers
used to be but they're strictly for manipulating data and making sure
that WebSocket events don't clash with REST methods.
*/

class GenericAction {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  handle(data: unknown, _something: unknown) {
    return data;
  }

  getPayload(data: Record<string, unknown>, manager: any, id: string, partialType: string, cache?: boolean) {
    const existing = manager.cache.get(id);
    if (!existing && this.client.options.partials.includes(partialType)) {
      return manager.add(data, cache);
    }
    return existing;
  }

  getChannel(data: any) {
    const id = data.channel_id || data.id;
    return (
      data.channel ||
      this.getPayload(
        {
          id,
          guild_id: data.guild_id,
          recipients: [data.author || { id: data.user_id }],
        },
        this.client.channels,
        id,
        PartialTypes.CHANNEL
      )
    );
  }

  getMessage(data: any, channel: any, cache?: boolean) {
    const id = data.message_id || data.id;
    return (
      data.message ||
      this.getPayload(
        {
          id,
          channel_id: channel.id,
          guild_id: data.guild_id || (channel.guild ? channel.guild.id : null),
        },
        channel.messages,
        id,
        PartialTypes.MESSAGE,
        cache
      )
    );
  }

  getReaction(data: any, message: any, user?: any) {
    const id = data.emoji.id || decodeURIComponent(data.emoji.name);
    return this.getPayload(
      {
        emoji: data.emoji,
        count: message.partial ? null : 0,
        me: user ? user.id === this.client.user!.id : false,
      },
      message.reactions,
      id,
      PartialTypes.REACTION
    );
  }

  getMember(data: any, guild: any) {
    return this.getPayload(data, guild.members, data.user.id, PartialTypes.GUILD_MEMBER);
  }

  getUser(data: any) {
    const id = data.user_id;
    return data.user || this.getPayload({ id }, this.client.users, id, PartialTypes.USER);
  }

  getUserFromMember(data: any) {
    if (data.guild_id && data.member && data.member.user) {
      const guild = this.client.guilds.cache.get(data.guild_id);
      if (guild) {
        return guild.members.add(data.member).user;
      } else {
        return this.client.users.add(data.member.user);
      }
    }
    return this.getUser(data);
  }
}

export default GenericAction;
