import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";
import Client from "../Client.ts";

export class GuildDeleteAction extends Action {
  deleted: Map<string, Guild>;

  constructor(client: Client) {
    super(client);
    this.deleted = new Map();
  }

  handle(data: any) {
    const client = this.client;

    let guild = client.guilds.cache.get(data.id);
    if (guild) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type === "text") channel.stopTyping(true);
      }

      if (data.unavailable) {
        guild.available = false;
        client.emit(Events.GUILD_UNAVAILABLE, guild);

        return {
          guild: null,
        };
      }

      for (const channel of guild.channels.cache.values()) this.client.channels.remove(channel.id);
      if (guild.voice && guild.voice.connection) guild.voice.connection.disconnect();

      client.guilds.cache.delete(guild.id);
      guild.deleted = true;

      client.emit(Events.GUILD_DELETE, guild);

      this.deleted.set(guild.id, guild);
      this.scheduleForDeletion(guild.id);
    } else {
      guild = this.deleted.get(data.id) || null;
    }

    return { guild };
  }

  scheduleForDeletion(id: string) {
    this.client.setTimeout(() => this.deleted.delete(id), this.client.options.restWsBridgeTimeout);
  }
}

export default GuildDeleteAction;
