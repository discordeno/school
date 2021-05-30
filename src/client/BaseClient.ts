import { EventEmitter, setImmediate, clearImmediate } from "../../deps.ts";

import RESTManager from "../rest/RESTManager.ts";
import { DefaultOptions } from "../util/Constants.ts";
import { flatten, mergeDefault } from "../util/Util.ts";

import type { ClientOptions } from "../../typings/client_options.ts";

export class BaseClient extends EventEmitter {
  /**
   * Timeouts set by {@link BaseClient#setTimeout} that are still active
   */
  #timeouts = new Set<number>();

  /**
   * Intervals set by {@link BaseClient#setInterval} that are still active
   */
  #intervals = new Set<number>();

  /**
   * Intervals set by {@link BaseClient#setImmediate} that are still active
   */
  #immediates = new Set<number>();

  /**
   * The options the client was instantiated with
   * @type {ClientOptions}
   */
  options: ClientOptions;

  /**
   * The REST manager of the client
   * @type {RESTManager}
   */
  rest: RESTManager;

  constructor(options = {}) {
    super();

    this.options = mergeDefault(DefaultOptions, options);
    // deno-lint-ignore no-explicit-any
    this.rest = new RESTManager(this, (options as any)._tokenType);
  }

  /**
   * API shortcut
   * @type {Object}
   * @readonly
   */
  get #api() {
    return this.rest.api;
  }

  /** Destroys all assets used by the base client. */
  destroy() {
    for (const t of this.#timeouts) this.clearTimeout(t);
    for (const i of this.#intervals) this.clearInterval(i);
    for (const i of this.#immediates) this.clearImmediate(i);
    this.#timeouts.clear();
    this.#intervals.clear();
    this.#immediates.clear();
  }

  /**
   * Sets a timeout that will be automatically cancelled if the client is destroyed.
   * @param {Function} fn Function to execute
   * @param {number} delay Time to wait before executing (in milliseconds)
   * @param {...*} args Arguments for the function
   * @returns {Timeout}
   */
  setTimeout(fn: (...args: unknown[]) => void, delay: number, ...args: unknown[]): number {
    const timeout = setTimeout(() => {
      fn(...args);
      this.#timeouts.delete(timeout);
    }, delay);
    this.#timeouts.add(timeout);
    return timeout;
  }

  /**
   * Clears a timeout.
   * @param {Timeout} timeout Timeout to cancel
   */
  clearTimeout(timeout: number) {
    clearTimeout(timeout);
    this.#timeouts.delete(timeout);
  }

  /**
   * Sets an interval that will be automatically cancelled if the client is destroyed.
   * @param {Function} fn Function to execute
   * @param {number} delay Time to wait between executions (in milliseconds)
   * @param {...*} args Arguments for the function
   * @returns {Timeout}
   */
  // deno-lint-ignore no-explicit-any
  setInterval(fn: (...args: any[]) => void, delay: number, ...args: any[]): number {
    const interval = setInterval(fn, delay, ...args);
    this.#intervals.add(interval);
    return interval;
  }

  /**
   * Clears an interval.
   * @param {Timeout} interval Interval to cancel
   */
  clearInterval(interval: number) {
    clearInterval(interval);
    this.#intervals.delete(interval);
  }

  /**
   * Sets an immediate that will be automatically cancelled if the client is destroyed.
   * @param {Function} fn Function to execute
   * @param {...*} args Arguments for the function
   * @returns {Immediate}
   */
  setImmediate(fn: (...args: unknown[]) => void, ...args: unknown[]): number {
    const immediate = setImmediate(fn, ...args);
    this.#immediates.add(immediate);
    return immediate;
  }

  /**
   * Clears an immediate.
   * @param {Immediate} immediate Immediate to cancel
   */
  clearImmediate(immediate: number) {
    clearImmediate(immediate);
    this.#immediates.delete(immediate);
  }

  /** Increments max listeners by one, if they are not zero. */
  #incrementMaxListeners() {
    const maxListeners = this.getMaxListeners();
    if (maxListeners !== 0) {
      this.setMaxListeners(maxListeners + 1);
    }
  }

  /** Decrements max listeners by one, if they are not zero. */
  #decrementMaxListeners() {
    const maxListeners = this.getMaxListeners();
    if (maxListeners !== 0) {
      this.setMaxListeners(maxListeners - 1);
    }
  }

  toJSON(...props) {
    return flatten(this, { domain: false }, ...props);
  }
}

export default BaseClient;
