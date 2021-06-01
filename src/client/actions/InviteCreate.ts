import Action from "./Action.ts";
import Invite from "../../structures/Invite.ts";
import { Events } from "../../util/Constants.ts";

export class InviteCreateAction extends Action {
  handle(data: any) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);
    const guild = client.guilds.cache.get(data.guild_id);
    if (!channel) return false;

    const inviteData = Object.assign(data, { channel, guild });
    const invite = new Invite(client, inviteData);

    client.emit(Events.INVITE_CREATE, invite);
    return { invite };
  }
}

export default InviteCreateAction;
