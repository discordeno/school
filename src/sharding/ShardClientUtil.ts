import { ShardingManagerMode, Snowflake } from "../../typings/mod.ts";
import Client from "../client/Client.ts";
import { Events } from "../util/Constants.ts";
import Util from "../util/Util.ts";
import { process } from "../../deps.ts";

export class ShardClientUtil {
  client: Client;
  mode: ShardingManagerMode;
  parentPort: any | null;

  constructor(client: Client, mode: ShardingManagerMode) {
    this.client = client;
    this.mode = mode;
    this.parentPort = null;

    if (mode === "process") {
      process.on("message", this._handleMessage.bind(this));
      client.on("ready", () => {
        process.send({ _ready: true });
      });
      client.on("disconnect", () => {
        process.send({ _disconnect: true });
      });
      client.on("reconnecting", () => {
        process.send({ _reconnecting: true });
      });
    } else if (mode === "worker") {
      this.parentPort = require("worker_threads").parentPort;
      this.parentPort.on("message", this._handleMessage.bind(this));
      client.on("ready", () => {
        this.parentPort.postMessage({ _ready: true });
      });
      client.on("disconnect", () => {
        this.parentPort.postMessage({ _disconnect: true });
      });
      client.on("reconnecting", () => {
        this.parentPort.postMessage({ _reconnecting: true });
      });
    }
  }

  get ids() {
    return this.client.options.shards;
  }

  get count() {
    return this.client.options.shardCount;
  }

  send(message: unknown) {
    return new Promise((resolve, reject) => {
      if (this.mode === "process") {
        process.send(message, (err) => {
          if (err) reject(err);
          // @ts-ignore whoopsies
          else resolve();
        });
      } else if (this.mode === "worker") {
        this.parentPort.postMessage(message);
        // @ts-ignore silly djs undefined is for kids
        resolve();
      }
    });
  }

  fetchClientValues(prop: string, shard: number) {
    return new Promise((resolve, reject) => {
      const parent = this.parentPort || process;

      const listener = (message) => {
        if (!message || message._sFetchProp !== prop || message._sFetchPropShard !== shard) return;
        parent.removeListener("message", listener);
        if (!message._error) resolve(message._result);
        else reject(Util.makeError(message._error));
      };
      parent.on("message", listener);

      this.send({ _sFetchProp: prop, _sFetchPropShard: shard }).catch((err) => {
        parent.removeListener("message", listener);
        reject(err);
      });
    });
  }

  broadcastEval(script: string | Function, shard: number) {
    return new Promise((resolve, reject) => {
      const parent = this.parentPort || process;
      script = typeof script === "function" ? `(${script})(this)` : script;

      const listener = (message) => {
        if (!message || message._sEval !== script || message._sEvalShard !== shard) return;
        parent.removeListener("message", listener);
        if (!message._error) resolve(message._result);
        else reject(Util.makeError(message._error));
      };
      parent.on("message", listener);

      this.send({ _sEval: script, _sEvalShard: shard }).catch((err) => {
        parent.removeListener("message", listener);
        reject(err);
      });
    });
  }

  respawnAll({ shardDelay = 5000, respawnDelay = 500, timeout = 30000 } = {}) {
    return this.send({ _sRespawnAll: { shardDelay, respawnDelay, timeout } });
  }

  async _handleMessage(message: any) {
    if (!message) return;
    if (message._fetchProp) {
      const props = message._fetchProp.split(".");
      let value = this.client;
      for (const prop of props) value = value[prop];
      this._respond("fetchProp", { _fetchProp: message._fetchProp, _result: value });
    } else if (message._eval) {
      try {
        this._respond("eval", { _eval: message._eval, _result: await this.client._eval(message._eval) });
      } catch (err) {
        this._respond("eval", { _eval: message._eval, _error: Util.makePlainError(err) });
      }
    }
  }

  _respond(type: string, message: unknown) {
    this.send(message).catch((err) => {
      err.message = `Error when sending ${type} response to master process: ${err.message}`;
      this.client.emit(Events.ERROR, err);
    });
  }

  static singleton(client: Client, mode: ShardingManagerMode) {
    if (!this._singleton) {
      this._singleton = new this(client, mode);
    } else {
      client.emit(
        Events.WARN,
        "Multiple clients created in child process/worker; only the first will handle sharding helpers."
      );
    }
    return this._singleton;
  }

  static shardIDForGuildID(guildID: Snowflake, shardCount: number) {
    const shard = Number(BigInt(guildID) >> 22n) % shardCount;
    if (shard < 0) throw new Error(`SHARDING_SHARD_MISCALCULATION ${shard}, ${guildID}, ${shardCount}`);
    return shard;
  }
}

export default ShardClientUtil;
