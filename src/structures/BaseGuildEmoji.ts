import Client from "../client/Client.ts";
import Emoji from './Emoji.ts';
import { Guild } from "./Guild.ts";

export class BaseGuildEmoji extends Emoji {
  guild: Guild;
  requiresColons: boolean | null;
  managed: boolean | null;
  available: boolean | null;

  constructor(client: Client, data: any, guild: Guild) {
    super(client, data);

    this.guild = guild;
    this.requiresColons = null;
    this.managed = null;
    this.available = null;

    Object.defineProperty(this, '_roles', { value: [], writable: true });

    this._patch(data);
  }

  _patch(data: any) {
    if (data.name) this.name = data.name;

    if (typeof data.require_colons !== 'undefined') {
      this.requiresColons = data.require_colons;
    }

    if (typeof data.managed !== 'undefined') {
      this.managed = data.managed;
    }

    if (typeof data.available !== 'undefined') {
      this.available = data.available;
    }

    // @ts-ignore idk y
    if (data.roles) this._roles = data.roles;
  }
}

export default BaseGuildEmoji;