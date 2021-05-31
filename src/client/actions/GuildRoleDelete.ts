import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class GuildRoleDeleteAction extends Action {
  handle(data: any) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    let role;

    if (guild) {
      role = guild.roles.cache.get(data.role_id);
      if (role) {
        guild.roles.cache.delete(data.role_id);
        role.deleted = true;
        client.emit(Events.GUILD_ROLE_DELETE, role);
      }
    }

    return { role };
  }
}

export default GuildRoleDeleteAction;
