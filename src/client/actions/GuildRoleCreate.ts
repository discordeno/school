import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class GuildRoleCreate extends Action {
  handle(data: any) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    let role;
    if (guild) {
      const already = guild.roles.cache.has(data.role.id);
      role = guild.roles.add(data.role);

      if (!already) client.emit(Events.GUILD_ROLE_CREATE, role);
    }
    return { role };
  }
}

export default GuildRoleCreate;
