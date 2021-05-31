import { EventEmitter, isAbsolute, resolve, statSync } from "../../deps.ts";
import Shard from "./Shard.ts";
import { DJSError } from "../errors/mod.ts";
import Collection from "../util/Collection.ts";
import Util from "../util/Util.ts";
import { ShardingManagerMode, ShardingManagerOptions } from "../../typings/mod.ts";

export class ShardingManager extends EventEmitter {
  file: string;
  respawn?: boolean;
  shardArgs?: string[];
  shards: Collection<number, Shard>;
  token: string | null;
  totalShards: number | "auto";
  shardList: number[] | "auto";
  mode?: ShardingManagerMode;
  execArgv?: string[];

  constructor(file: string, options: ShardingManagerOptions = {}) {
    super();
    options = Util.mergeDefault(
      {
        totalShards: "auto",
        mode: "process",
        respawn: true,
        shardArgs: [],
        execArgv: [],
        token: Deno.env.get("DISCORD_TOKEN"),
      },
      // @ts-ignore whatever
      options
    );

    this.file = file;
    if (!file) throw new DJSError.Error("CLIENT_INVALID_OPTION", "File", "specified.");
    if (!isAbsolute(file)) this.file = resolve(Deno.cwd(), file);
    const stats = statSync(this.file);
    if (!stats.isFile()) throw new DJSError.Error("CLIENT_INVALID_OPTION", "File", "a file");

    this.shardList = options.shardList || "auto";
    if (this.shardList !== "auto") {
      if (!Array.isArray(this.shardList)) {
        throw new DJSError.TypeError("CLIENT_INVALID_OPTION", "shardList", "an array.");
      }
      this.shardList = [...new Set(this.shardList)];
      if (this.shardList.length < 1)
        throw new DJSError.RangeError("CLIENT_INVALID_OPTION", "shardList", "at least 1 ID.");
      if (
        this.shardList.some(
          (shardID) => typeof shardID !== "number" || isNaN(shardID) || !Number.isInteger(shardID) || shardID < 0
        )
      ) {
        throw new DJSError.TypeError("CLIENT_INVALID_OPTION", "shardList", "an array of positive integers.");
      }
    }

    this.totalShards = options.totalShards || "auto";
    if (this.totalShards !== "auto") {
      if (typeof this.totalShards !== "number" || isNaN(this.totalShards)) {
        throw new DJSError.TypeError("CLIENT_INVALID_OPTION", "Amount of shards", "a number.");
      }
      if (this.totalShards < 1)
        throw new DJSError.RangeError("CLIENT_INVALID_OPTION", "Amount of shards", "at least 1.");
      if (!Number.isInteger(this.totalShards)) {
        throw new DJSError.RangeError("CLIENT_INVALID_OPTION", "Amount of shards", "an integer.");
      }
    }

    this.mode = options.mode;
    if (this.mode !== "process" && this.mode !== "worker") {
      throw new DJSError.RangeError("CLIENT_INVALID_OPTION", "Sharding mode", '"process" or "worker"');
    }

    this.respawn = options.respawn;
    this.shardArgs = options.shardArgs;
    this.execArgv = options.execArgv;
    this.token = options.token ? options.token.replace(/^Bot\s*/i, "") : null;
    this.shards = new Collection();
    Deno.env.set("SHARDING_MANAGER_MODE", this.mode);
    // @ts-ignore lets hack
    Deno.env.set("SHARDING_MANAGER", true);
    // @ts-ignore lets hack
    Deno.env.set("DISCORD_TOKEN", this.token);
  }

  createShard(id = this.shards.size) {
    const shard = new Shard(this, id);
    this.shards.set(id, shard);
    this.emit("shardCreate", shard);
    return shard;
  }

  async spawn({ amount = this.totalShards, delay = 5500, timeout = 30000 } = {}) {
    if (amount === "auto") {
      amount = await Util.fetchRecommendedShards(this.token || "");
    } else {
      if (typeof amount !== "number" || isNaN(amount)) {
        throw new DJSError.TypeError("CLIENT_INVALID_OPTION", "Amount of shards", "a number.");
      }
      if (amount < 1) throw new DJSError.RangeError("CLIENT_INVALID_OPTION", "Amount of shards", "at least 1.");
      if (!Number.isInteger(amount)) {
        throw new DJSError.TypeError("CLIENT_INVALID_OPTION", "Amount of shards", "an integer.");
      }
    }

    if (this.shards.size >= amount) throw new DJSError.Error("SHARDING_ALREADY_SPAWNED", this.shards.size);
    if (this.shardList === "auto" || this.totalShards === "auto" || this.totalShards !== amount) {
      this.shardList = [...Array(amount).keys()];
    }
    if (this.totalShards === "auto" || this.totalShards !== amount) {
      this.totalShards = amount;
    }

    if (this.shardList.some((shardID) => shardID >= amount)) {
      throw new DJSError.RangeError(
        "CLIENT_INVALID_OPTION",
        "Amount of shards",
        "bigger than the highest shardID in the shardList option."
      );
    }

    for (const shardID of this.shardList) {
      const promises = [];
      const shard = this.createShard(shardID);
      promises.push(shard.spawn(timeout));
      if (delay > 0 && this.shards.size !== this.shardList.length) promises.push(Util.delayFor(delay));
      await Promise.all(promises); // eslint-disable-line no-await-in-loop
    }

    return this.shards;
  }

  broadcast(message: unknown) {
    const promises = [];
    for (const shard of this.shards.values()) promises.push(shard.send(message));
    return Promise.all(promises);
  }

  broadcastEval(script: string, shard: number) {
    return this._performOnShards("eval", [script], shard);
  }

  fetchClientValues(prop: string, shard: number) {
    return this._performOnShards("fetchClientValue", [prop], shard);
  }

  // deno-lint-ignore no-explicit-any
  _performOnShards(method: string, args: any[], shard: number): Promise<any> {
    if (this.shards.size === 0) return Promise.reject(new DJSError.Error("SHARDING_NO_SHARDS"));

    if (typeof shard === "number") {
      // @ts-ignore hacks away
      if (this.shards.has(shard)) return this.shards.get(shard)[method](...args);
      return Promise.reject(new DJSError.Error("SHARDING_SHARD_NOT_FOUND", shard));
    }

    if (this.shards.size !== this.shardList.length) return Promise.reject(new DJSError.Error("SHARDING_IN_PROCESS"));

    const promises = [];
    // @ts-ignore oops i did it again
    for (const sh of this.shards.values()) promises.push(sh[method](...args));
    return Promise.all(promises);
  }

  async respawnAll({ shardDelay = 5000, respawnDelay = 500, timeout = 30000 } = {}): Promise<
    Collection<number, Shard>
  > {
    let s = 0;
    for (const shard of this.shards.values()) {
      // @ts-ignore whaaaaa
      const promises = [shard.respawn({ respawnDelay, timeout })];
      if (++s < this.shards.size && shardDelay > 0) promises.push(Util.delayFor(shardDelay));
      await Promise.all(promises);
    }
    return this.shards;
  }
}

export default ShardingManager;
