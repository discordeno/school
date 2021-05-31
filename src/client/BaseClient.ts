import { EventEmitter, setImmediate, clearImmediate } from "../../deps.ts";

import RESTManager from "../rest/RESTManager.ts";
import { DefaultOptions } from "../util/Constants.ts";
import Util from "../util/Util.ts";

import type { ClientOptions } from "../../typings/mod.ts";

export class BaseClient extends EventEmitter {
  timeouts = new Set<number>();
  intervals = new Set<number>();
  immediates = new Set<number>();
  options: ClientOptions;
  rest: RESTManager;

  constructor(options = {}) {
    super();

    // @ts-ignore afsdc
    this.options = Util.mergeDefault(DefaultOptions, options);
    // @ts-ignore asdf
    // deno-lint-ignore no-explicit-any
    this.rest = new RESTManager(this, (options as any)._tokenType);
  }

  get api() {
    return this.rest.api;
  }

  destroy() {
    for (const t of this.timeouts) this.clearTimeout(t);
    for (const i of this.intervals) this.clearInterval(i);
    for (const i of this.immediates) this.clearImmediate(i);
    this.timeouts.clear();
    this.intervals.clear();
    this.immediates.clear();
  }

  setTimeout(fn: (...args: unknown[]) => void, delay: number, ...args: unknown[]): number {
    const timeout = setTimeout(() => {
      fn(...args);
      this.timeouts.delete(timeout);
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  clearTimeout(timeout: number) {
    clearTimeout(timeout);
    this.timeouts.delete(timeout);
  }

  // deno-lint-ignore no-explicit-any
  setInterval(fn: (...args: any[]) => void, delay: number, ...args: any[]): number {
    const interval = setInterval(fn, delay, ...args);
    this.intervals.add(interval);
    return interval;
  }

  clearInterval(interval: number) {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  setImmediate(fn: (...args: unknown[]) => void, ...args: unknown[]): number {
    const immediate = setImmediate(fn, ...args);
    this.immediates.add(immediate);
    return immediate;
  }

  clearImmediate(immediate: number) {
    clearImmediate(immediate);
    this.immediates.delete(immediate);
  }

  incrementMaxListeners() {
    const maxListeners = this.getMaxListeners();
    if (maxListeners !== 0) {
      this.setMaxListeners(maxListeners + 1);
    }
  }

  decrementMaxListeners() {
    const maxListeners = this.getMaxListeners();
    if (maxListeners !== 0) {
      this.setMaxListeners(maxListeners - 1);
    }
  }

  // @ts-ignore bruh
  toJSON(...props) {
    // @ts-ignore just do it
    return Util.flatten(this, { domain: false }, ...props);
  }
}

export default BaseClient;
