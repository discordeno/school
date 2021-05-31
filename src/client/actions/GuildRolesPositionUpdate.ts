import Action from "./Action.ts";

export class GuildRolesPositionUpdate extends Action {
  handle(data: any) {
    const client = this.client;

    const guild = client.guilds.cache.get(data.guild_id);
    if (guild) {
      for (const partialRole of data.roles) {
        const role = guild.roles.cache.get(partialRole.id);
        if (role) role.rawPosition = partialRole.position;
      }
    }

    return { guild };
  }
}

export default GuildRolesPositionUpdate;
