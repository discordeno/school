import Action from "./Action.ts";
import { Events } from "../../util/Constants.ts";

export class PresenceUpdateAction extends Action {
  handle(data: any) {
    let user = this.client.users.cache.get(data.user.id);
    if (!user && data.user.username) user = this.client.users.add(data.user);
    if (!user) return;

    if (data.user && data.user.username) {
      if (!user.equals(data.user)) this.client.actions.UserUpdate.handle(data.user);
    }

    const guild = this.client.guilds.cache.get(data.guild_id);
    if (!guild) return;

    let oldPresence = guild.presences.cache.get(user.id);
    if (oldPresence) oldPresence = oldPresence._clone();
    let member = guild.members.cache.get(user.id);
    if (!member && data.status !== "offline") {
      member = guild.members.add({
        user,
        roles: data.roles,
        deaf: false,
        mute: false,
      });
      this.client.emit(Events.GUILD_MEMBER_AVAILABLE, member);
    }
    guild.presences.add(Object.assign(data, { guild }));
    if (member && this.client.listenerCount(Events.PRESENCE_UPDATE)) {
      this.client.emit(Events.PRESENCE_UPDATE, oldPresence, member.presence);
    }
  }
}

export default PresenceUpdateAction;
