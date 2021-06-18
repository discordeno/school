import Client from "../client/Client.ts";
import Base from "./Base.ts";

export class Guild extends Base {
  constructor(client: Client) {
    super(client);
  }
}

export default Guild;
