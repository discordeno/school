import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class GuildBanRemove extends Action {
  handle(data: any) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    const user = client.users.add(data.user);

    if (guild && user) client.emit(Events.GUILD_BAN_REMOVE, guild, user);
  }
}

export default GuildBanRemove;
