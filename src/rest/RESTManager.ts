import APIRequest from "./APIRequest.ts";
import routeBuilder from "./APIRouter.ts";
import RequestHandler from "./RequestHandler.ts";
import { DJSError } from "../errors/mod.ts";
import Collection from "../util/Collection.ts";
import { Endpoints } from "../util/Constants.ts";
import Client from "../client/Client.ts";

class RESTManager {
  client: Client;
  handlers: Collection<string, unknown>;
  tokenPrefix: string;
  versioned: boolean;
  globalTimeout: number | null;

  constructor(client: Client, tokenPrefix = "Bot") {
    this.client = client;
    this.handlers = new Collection();
    this.tokenPrefix = tokenPrefix;
    this.versioned = true;
    this.globalTimeout = null;
    if (client.options.restSweepInterval && client.options.restSweepInterval > 0) {
      client.setInterval(() => {
        // deno-lint-ignore no-explicit-any
        this.handlers.sweep((handler: any) => handler._inactive);
      }, client.options.restSweepInterval * 1000);
    }
  }

  get api() {
    return routeBuilder(this);
  }

  getAuth() {
    const token = this.client.token || this.client.accessToken;
    if (token) return `${this.tokenPrefix} ${token}`;
    throw new DJSError.Error("TOKEN_MISSING");
  }

  get cdn() {
    return Endpoints.CDN(this.client.options.http.cdn);
  }

  request(method: string, url: string, options = {}) {
    const apiRequest = new APIRequest(this, method, url, options);
    let handler = this.handlers.get(apiRequest.route);

    if (!handler) {
      handler = new RequestHandler(this);
      this.handlers.set(apiRequest.route, handler);
    }

    return handler.push(apiRequest);
  }

  get endpoint() {
    return this.client.options.http.api;
  }

  set endpoint(endpoint) {
    this.client.options.http.api = endpoint;
  }
}

export default RESTManager;
