import Client from "../client/Client.ts";
import Util from "../util/Util.ts";

export class Base {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  _clone() {
    return Object.assign(Object.create(this), this);
  }

  _patch(data: unknown) {
    return data;
  }

  _update(data: unknown) {
    const clone = this._clone();
    this._patch(data);
    return clone;
  }

  // @ts-ignore umm what
  toJSON(...props) {
    // @ts-ignore umm what
    return Util.flatten(this, ...props);
  }

  valueOf() {
    // @ts-ignore umm what
    return this.id;
  }
}

export default Base;
