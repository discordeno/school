import Channel from "./Channel.ts";
import { DJSError } from "../errors/mod.ts";
import { ImageFormatOptions } from "../../typings/mod.ts";
import Client from "../client/Client.ts";

export class PartialGroupDMChannel extends Channel {
  name: string;
  icon: string;

  constructor(client: Client, data) {
    super(client, data);

    this.name = data.name;
    this.icon = data.icon;
  }

  iconURL({ format, size }: ImageFormatOptions = {}) {
    if (!this.icon) return null;
    return this.client.rest.cdn.GDMIcon(this.id, this.icon, format, size!);
  }

  delete() {
    return Promise.reject(new DJSError.Error("DELETE_GROUP_DM_CHANNEL"));
  }

  fetch() {
    return Promise.reject(new DJSError.Error("FETCH_GROUP_DM_CHANNEL"));
  }
}

export default PartialGroupDMChannel;
