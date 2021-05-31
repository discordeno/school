import Action from "./Action.ts";
import { Events, Status } from "../../util/Constants.ts";

export class GuildMemberRemoveAction extends Action {
  handle(data: any, shard: any) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    let member = null;
    if (guild) {
      member = this.getMember({ user: data.user }, guild);
      guild.memberCount--;
      if (member) {
        member.deleted = true;
        guild.members.cache.delete(member.id);
        if (shard.status === Status.READY) client.emit(Events.GUILD_MEMBER_REMOVE, member);
      }
      guild.voiceStates.cache.delete(data.user.id);
    }
    return { guild, member };
  }
}

export default GuildMemberRemoveAction;
