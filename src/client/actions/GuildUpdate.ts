import Action from './Action.ts';
import { Events } from '../../util/Constants.ts';

export class GuildUpdateAction extends Action {
  handle(data: any) {
    const client = this.client;

    const guild = client.guilds.cache.get(data.id);
    if (guild) {
      const old = guild._update(data);
      client.emit(Events.GUILD_UPDATE, old, guild);
      return {
        old,
        updated: guild,
      };
    }

    return {
      old: null,
      updated: null,
    };
  }
}

export default GuildUpdateAction;