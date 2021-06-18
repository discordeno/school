import Base from "./Base.ts";
import Snowflake from "../util/Snowflake.ts";
import Client from "../client/Client.ts";

export class Emoji extends Base {
  animated: boolean;
  name: string;
  id: string;
  deleted: false;

  constructor(client: Client, emoji: any) {
    super(client);

    this.animated = emoji.animated;
    this.name = emoji.name;
    this.id = emoji.id;
    this.deleted = false;
  }

  get identifier() {
    if (this.id) return `${this.animated ? "a:" : ""}${this.name}:${this.id}`;
    return encodeURIComponent(this.name);
  }

  get url() {
    if (!this.id) return null;
    return this.client.rest.cdn.Emoji(this.id, this.animated ? "gif" : "png");
  }

  get createdTimestamp() {
    if (!this.id) return null;
    return Snowflake.deconstruct(this.id).timestamp;
  }

  get createdAt() {
    if (!this.id) return null;
    return new Date(this.createdTimestamp!);
  }

  toString() {
    return this.id ? `<${this.animated ? "a" : ""}:${this.name}:${this.id}>` : this.name;
  }

  toJSON() {
    return super.toJSON({
      guild: "guildID",
      createdTimestamp: true,
      url: true,
      identifier: true,
    });
  }
}

export default Emoji;
