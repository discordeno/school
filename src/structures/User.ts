import Client from "../client/Client.ts";
import Base from "./Base.ts";

export class User extends Base {
  constructor(client: Client) {
    super(client);
  }
}

export default User;
