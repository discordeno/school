import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class GuildIntegrationsUpdate extends Action {
  handle(data: any) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    if (guild) client.emit(Events.GUILD_INTEGRATIONS_UPDATE, guild);
  }
}

export default GuildIntegrationsUpdate;
