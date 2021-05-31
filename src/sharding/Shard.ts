import { EventEmitter, resolve as pathResolve, ChildProcess } from "../../deps.ts";
import { DJSError } from "../errors/mod.ts";
import Util from "../util/Util.ts";
import ShardingManager from "./ShardingManager.ts";

let childProcess = null;
let Worker = null;

export class Shard extends EventEmitter {
  _evals: Map<string, Promise<unknown>>;
  _exitListener: (...args: unknown[]) => void;
  _fetches: Map<string, Promise<unknown>>;

  args: string[];
  execArgv?: string[];
  env: Record<string, unknown>;
  id: number;
  manager: ShardingManager;
  process: ChildProcess | null;
  ready: boolean;
  worker: any | null;

  constructor(manager: ShardingManager, id: number) {
    super();

    if (manager.mode === "process") childProcess = new ChildProcess();
    else if (manager.mode === "worker") Worker = require("worker_threads").Worker;

    this.manager = manager;
    this.id = id;
    this.args = manager.shardArgs || [];
    this.execArgv = manager.execArgv;
    this.env = {
      SHARDING_MANAGER: Deno.env.get("SHARDING_MANAGER") || true,
      SHARDS: Deno.env.get("SHARDS") || this.id,
      SHARD_COUNT: Deno.env.get("SHARD_COUNT") || this.manager.totalShards,
      DISCORD_TOKEN: Deno.env.get("DISCORD_TOKEN") || this.manager.token,
    };

    this.ready = false;
    this.process = null;
    this.worker = null;
    this._evals = new Map();
    this._fetches = new Map();
    this._exitListener = this._handleExit.bind(this, undefined);
  }

  async spawn(timeout = 30000) {
    if (this.process) throw new DJSError.Error("SHARDING_PROCESS_EXISTS", this.id);
    if (this.worker) throw new DJSError.Error("SHARDING_WORKER_EXISTS", this.id);

    if (this.manager.mode === "process") {
      this.process = childProcess
        .fork(pathResolve(this.manager.file), this.args, {
          env: this.env,
          execArgv: this.execArgv,
        })
        .on("message", this._handleMessage.bind(this))
        .on("exit", this._exitListener);
    } else if (this.manager.mode === "worker") {
      this.worker = new Worker(pathResolve(this.manager.file), { workerData: this.env })
        .on("message", this._handleMessage.bind(this))
        .on("exit", this._exitListener);
    }

    this._evals.clear();
    this._fetches.clear();

    this.emit("spawn", this.process || this.worker);

    if (timeout === -1 || timeout === Infinity) return this.process || this.worker;
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(spawnTimeoutTimer);
        this.off("ready", onReady);
        this.off("disconnect", onDisconnect);
        this.off("death", onDeath);
      };

      const onReady = () => {
        cleanup();
        // @ts-ignore wowza
        resolve();
      };

      const onDisconnect = () => {
        cleanup();
        reject(new DJSError.Error("SHARDING_READY_DISCONNECTED", this.id));
      };

      const onDeath = () => {
        cleanup();
        reject(new DJSError.Error("SHARDING_READY_DIED", this.id));
      };

      const onTimeout = () => {
        cleanup();
        reject(new DJSError.Error("SHARDING_READY_TIMEOUT", this.id));
      };

      const spawnTimeoutTimer = setTimeout(onTimeout, timeout);
      this.once("ready", onReady);
      this.once("disconnect", onDisconnect);
      this.once("death", onDeath);
    });
    return this.process || this.worker;
  }

  kill() {
    if (this.process) {
      this.process.removeListener("exit", this._exitListener);
      this.process.kill();
    } else {
      this.worker.removeListener("exit", this._exitListener);
      this.worker.terminate();
    }

    this._handleExit(false);
  }

  async respawn({ delay = 500, timeout = 30000 } = {}) {
    this.kill();
    if (delay > 0) await Util.delayFor(delay);
    return this.spawn(timeout);
  }

  send(message: unknown) {
    return new Promise((resolve, reject) => {
      if (this.process) {
        this.process.send(message, (err) => {
          if (err) reject(err);
          else resolve(this);
        });
      } else {
        this.worker.postMessage(message);
        resolve(this);
      }
    });
  }

  fetchClientValue(prop: string) {
    // Shard is dead (maybe respawning), don't cache anything and error immediately
    if (!this.process && !this.worker) return Promise.reject(new DJSError.Error("SHARDING_NO_CHILD_EXISTS", this.id));

    // Cached promise from previous call
    if (this._fetches.has(prop)) return this._fetches.get(prop);

    const promise = new Promise((resolve, reject) => {
      const child = this.process || this.worker;

      const listener = (message) => {
        if (!message || message._fetchProp !== prop) return;
        child.removeListener("message", listener);
        this._fetches.delete(prop);
        resolve(message._result);
      };
      child.on("message", listener);

      this.send({ _fetchProp: prop }).catch((err) => {
        child.removeListener("message", listener);
        this._fetches.delete(prop);
        reject(err);
      });
    });

    this._fetches.set(prop, promise);
    return promise;
  }

  eval(script: string) {
    // Shard is dead (maybe respawning), don't cache anything and error immediately
    if (!this.process && !this.worker) return Promise.reject(new DJSError.Error("SHARDING_NO_CHILD_EXISTS", this.id));

    // Cached promise from previous call
    if (this._evals.has(script)) return this._evals.get(script);

    const promise = new Promise((resolve, reject) => {
      const child = this.process || this.worker;

      const listener = (message) => {
        if (!message || message._eval !== script) return;
        child.removeListener("message", listener);
        this._evals.delete(script);
        if (!message._error) resolve(message._result);
        else reject(Util.makeError(message._error));
      };
      child.on("message", listener);

      const _eval = typeof script === "function" ? `(${script})(this)` : script;
      this.send({ _eval }).catch((err) => {
        child.removeListener("message", listener);
        this._evals.delete(script);
        reject(err);
      });
    });

    this._evals.set(script, promise);
    return promise;
  }

  _handleMessage(message: any) {
    if (message) {
      if (message._ready) {
        this.ready = true;
        this.emit("ready");
        return;
      }

      // Shard has disconnected
      if (message._disconnect) {
        this.ready = false;
        this.emit("disconnect");
        return;
      }

      if (message._reconnecting) {
        this.ready = false;
        this.emit("reconnecting");
        return;
      }

      if (message._sFetchProp) {
        const resp = { _sFetchProp: message._sFetchProp, _sFetchPropShard: message._sFetchPropShard };
        this.manager.fetchClientValues(message._sFetchProp, message._sFetchPropShard).then(
          (results) => this.send({ ...resp, _result: results }),
          (err) => this.send({ ...resp, _error: Util.makePlainError(err) })
        );
        return;
      }

      if (message._sEval) {
        const resp = { _sEval: message._sEval, _sEvalShard: message._sEvalShard };
        this.manager.broadcastEval(message._sEval, message._sEvalShard).then(
          (results) => this.send({ ...resp, _result: results }),
          (err) => this.send({ ...resp, _error: Util.makePlainError(err) })
        );
        return;
      }

      if (message._sRespawnAll) {
        const { shardDelay, respawnDelay, timeout } = message._sRespawnAll;
        this.manager.respawnAll({ shardDelay, respawnDelay, timeout }).catch();
        return;
      }
    }

    this.emit("message", message);
  }

  _handleExit(respawn = this.manager.respawn) {
    this.emit("death", this.process || this.worker);

    this.ready = false;
    this.process = null;
    this.worker = null;
    this._evals.clear();
    this._fetches.clear();

    if (respawn) this.spawn().catch((err) => this.emit("error", err));
  }
}

export default Shard;
