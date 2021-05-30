import AsyncQueue from "./AsyncQueue.ts";
import DiscordAPIError from "./DiscordAPIError.ts";
import HTTPError from "./HTTPError.ts";
import { Events, browser } from "../util/Constants.ts";
import Util from "../util/Util.ts";
import RESTManager from "./RESTManager.ts";

// deno-lint-ignore no-explicit-any
function parseResponse(res: any) {
  if (res.headers.get("content-type")?.startsWith("application/json")) return res.json();
  if (browser) return res.blob();
  return res.buffer();
}

function getAPIOffset(serverDate: string) {
  return new Date(serverDate).getTime() - Date.now();
}

function calculateReset(reset: string, serverDate: string) {
  return new Date(Number(reset) * 1000).getTime() - getAPIOffset(serverDate);
}

class RequestHandler {
  manager: RESTManager;
  queue: AsyncQueue;
  reset: number;
  remaining: number;
  limit: number;
  retryAfter: number;

  constructor(manager: RESTManager) {
    this.manager = manager;
    this.queue = new AsyncQueue();
    this.reset = -1;
    this.remaining = -1;
    this.limit = -1;
    this.retryAfter = -1;
  }

  async push(request: unknown) {
    await this.queue.wait();
    try {
      return await this.execute(request);
    } finally {
      this.queue.shift();
    }
  }

  get limited() {
    return Boolean(this.manager.globalTimeout) || (this.remaining <= 0 && Date.now() < this.reset);
  }

  get _inactive() {
    return this.queue.remaining === 0 && !this.limited;
  }

  // deno-lint-ignore no-explicit-any
  async execute(request: any): Promise<unknown> {
    if (this.limited) {
      const timeout = this.reset + this.manager.client.options.restTimeOffset! - Date.now();

      if (this.manager.client.listenerCount(Events.RATE_LIMIT)) {
        this.manager.client.emit(Events.RATE_LIMIT, {
          timeout,
          limit: this.limit,
          method: request.method,
          path: request.path,
          route: request.route,
        });
      }

      if (this.manager.globalTimeout) {
        await this.manager.globalTimeout;
      } else {
        await Util.delayFor(timeout);
      }
    }

    let res;
    try {
      res = await request.make();
    } catch (error) {
      if (request.retries === this.manager.client.options.retryLimit) {
        throw new HTTPError(error.message, error.constructor.name, error.status, request.method, request.path);
      }

      request.retries++;
      return this.execute(request);
    }

    if (res && res.headers) {
      const serverDate = res.headers.get("date");
      const limit = res.headers.get("x-ratelimit-limit");
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = res.headers.get("x-ratelimit-reset");
      const retryAfter = res.headers.get("retry-after");

      this.limit = limit ? Number(limit) : Infinity;
      this.remaining = remaining ? Number(remaining) : 1;
      this.reset = reset ? calculateReset(reset, serverDate) : Date.now();
      this.retryAfter = retryAfter ? Number(retryAfter) : -1;

      if (request.route.includes("reactions")) {
        this.reset = new Date(serverDate).getTime() - getAPIOffset(serverDate) + 250;
      }

      if (res.headers.get("x-ratelimit-global")) {
        // @ts-ignore hacky js
        this.manager.globalTimeout = Util.delayFor(this.retryAfter);
        await this.manager.globalTimeout;
        this.manager.globalTimeout = null;
      }
    }

    if (res.ok) {
      return parseResponse(res);
    }

    if (res.status >= 400 && res.status < 500) {
      if (res.status === 429) {
        this.manager.client.emit("debug", `429 hit on route ${request.route}`);
        await Util.delayFor(this.retryAfter);
        return this.execute(request);
      }

      let data;
      try {
        data = await parseResponse(res);
      } catch (err) {
        throw new HTTPError(err.message, err.constructor.name, err.status, request.method, request.path);
      }

      throw new DiscordAPIError(request.path, data, request.method, res.status);
    }

    if (res.status >= 500 && res.status < 600) {
      if (request.retries === this.manager.client.options.retryLimit) {
        throw new HTTPError(res.statusText, res.constructor.name, res.status, request.method, request.path);
      }

      request.retries++;
      return this.execute(request);
    }

    return null;
  }
}

export default RequestHandler;
