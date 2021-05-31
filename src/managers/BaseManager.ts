import { Constructable } from "../../typings/mod.ts";
import Client from "../client/Client.ts";
import Collection from "../util/Collection.ts";
import Structures from "../util/Structures.ts";

export class BaseManager<K, Holds, R> {
  holds: Constructable<Holds>;
  cache: Collection<K, Holds>;
  cacheType: Collection<K, Holds>;
  readonly client: Client;

  constructor(
    client: Client,
    iterable: Iterable<any>,
    holds: Constructable<Holds>,
    cacheType = Collection,
    ...cacheOptions: unknown[]
  ) {
    // @ts-ignore umm no idea
    this.holds = Structures.get(holds.name) || holds;
    this.client = client;
    // @ts-ignore umm no idea
    this.cacheType = cacheType;
    // @ts-ignore umm no idea
    this.cache = new cacheType(...cacheOptions);
    if (iterable) for (const i of iterable) this.add(i);
  }

  add(data: any, cache?: boolean, info: { id?: K; extras: any[] } = { extras: [] }): Holds {
    const existing = this.cache.get(info?.id || data.id);
    // @ts-ignore umm no idea
    if (existing && existing._patch && cache) existing._patch(data);
    if (existing) return existing;

    const entry = this.holds ? new this.holds(this.client, data, ...info.extras) : data;
    if (cache) this.cache.set(info?.id || entry.id, entry);
    return entry;
  }

  resolve(idOrInstance: R): Holds | null {
    if (idOrInstance instanceof this.holds) return idOrInstance;
    // @ts-ignore umm no idea
    if (typeof idOrInstance === "string") return this.cache.get(idOrInstance) || null;
    return null;
  }

  resolveID(idOrInstance: R): string | null {
    // @ts-ignore okay
    if (idOrInstance instanceof this.holds) return idOrInstance.id;
    if (typeof idOrInstance === "string") return idOrInstance;
    return null;
  }

  valueOf() {
    return this.cache;
  }
}

export default BaseManager;
