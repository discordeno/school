// Copyright 2015 - 2021 Amish Shah

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Util from "./Util.ts";

export interface CollectionConstructor {
  new (): Collection<unknown, unknown>;
  new <K, V>(entries?: ReadonlyArray<readonly [K, V]> | null): Collection<K, V>;
  new <K, V>(iterable: Iterable<readonly [K, V]>): Collection<K, V>;
  readonly prototype: Collection<unknown, unknown>;
  readonly [Symbol.species]: CollectionConstructor;
}

export class Collection<K, V> extends Map<K, V> {
  public static readonly default: typeof Collection = Collection;
  public ["constructor"]: typeof Collection;

  public get(key: K): V | undefined {
    return super.get(key);
  }

  public set(key: K, value: V): this {
    return super.set(key, value);
  }

  public has(key: K): boolean {
    return super.has(key);
  }

  public delete(key: K): boolean {
    return super.delete(key);
  }

  public clear(): void {
    return super.clear();
  }

  public first(): V | undefined;
  public first(amount: number): V[];
  public first(amount?: number): V | V[] | undefined {
    if (typeof amount === "undefined") return this.values().next().value;
    if (amount < 0) return this.last(amount * -1);
    amount = Math.min(this.size, amount);
    const iter = this.values();
    return Array.from({ length: amount }, (): V => iter.next().value);
  }

  public firstKey(): K | undefined;
  public firstKey(amount: number): K[];
  public firstKey(amount?: number): K | K[] | undefined {
    if (typeof amount === "undefined") return this.keys().next().value;
    if (amount < 0) return this.lastKey(amount * -1);
    amount = Math.min(this.size, amount);
    const iter = this.keys();
    return Array.from({ length: amount }, (): K => iter.next().value);
  }

  public last(): V | undefined;
  public last(amount: number): V[];
  public last(amount?: number): V | V[] | undefined {
    const arr = [...this.values()];
    if (typeof amount === "undefined") return arr[arr.length - 1];
    if (amount < 0) return this.first(amount * -1);
    if (!amount) return [];
    return arr.slice(-amount);
  }

  public lastKey(): K | undefined;
  public lastKey(amount: number): K[];
  public lastKey(amount?: number): K | K[] | undefined {
    const arr = [...this.keys()];
    if (typeof amount === "undefined") return arr[arr.length - 1];
    if (amount < 0) return this.firstKey(amount * -1);
    if (!amount) return [];
    return arr.slice(-amount);
  }

  public random(): V;
  public random(amount: number): V[];
  public random(amount?: number): V | V[] {
    const arr = [...this.values()];
    if (typeof amount === "undefined") return arr[Math.floor(Math.random() * arr.length)];
    if (!arr.length || !amount) return [];
    return Array.from(
      { length: Math.min(amount, arr.length) },
      (): V => arr.splice(Math.floor(Math.random() * arr.length), 1)[0]
    );
  }

  public randomKey(): K;
  public randomKey(amount: number): K[];
  public randomKey(amount?: number): K | K[] {
    const arr = [...this.keys()];
    if (typeof amount === "undefined") return arr[Math.floor(Math.random() * arr.length)];
    if (!arr.length || !amount) return [];
    return Array.from(
      { length: Math.min(amount, arr.length) },
      (): K => arr.splice(Math.floor(Math.random() * arr.length), 1)[0]
    );
  }

  public find(fn: (value: V, key: K, collection: this) => boolean): V | undefined;
  public find<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg: T): V | undefined;
  public find(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): V | undefined {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    for (const [key, val] of this) {
      if (fn(val, key, this)) return val;
    }
    return undefined;
  }

  public findKey(fn: (value: V, key: K, collection: this) => boolean): K | undefined;
  public findKey<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg: T): K | undefined;
  public findKey(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): K | undefined {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    for (const [key, val] of this) {
      if (fn(val, key, this)) return key;
    }
    return undefined;
  }

  public sweep(fn: (value: V, key: K, collection: this) => boolean): number;
  public sweep<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg: T): number;
  public sweep(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): number {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    const previousSize = this.size;
    for (const [key, val] of this) {
      if (fn(val, key, this)) this.delete(key);
    }
    return previousSize - this.size;
  }

  public filter(fn: (value: V, key: K, collection: this) => boolean): this;
  public filter<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg: T): this;
  public filter(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): this {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    const results = new this.constructor[Symbol.species]<K, V>() as this;
    for (const [key, val] of this) {
      if (fn(val, key, this)) results.set(key, val);
    }
    return results;
  }

  public partition(fn: (value: V, key: K, collection: this) => boolean): [this, this];
  public partition<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg: T): [this, this];
  public partition(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): [this, this] {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    const results: [this, this] = [
      new this.constructor[Symbol.species]() as this,
      new this.constructor[Symbol.species]() as this,
    ];
    for (const [key, val] of this) {
      if (fn(val, key, this)) {
        results[0].set(key, val);
      } else {
        results[1].set(key, val);
      }
    }
    return results;
  }

  public flatMap<T>(fn: (value: V, key: K, collection: this) => Collection<K, T>): Collection<K, T>;
  public flatMap<T, This>(
    fn: (this: This, value: V, key: K, collection: this) => Collection<K, T>,
    thisArg: This
  ): Collection<K, T>;
  public flatMap<T>(fn: (value: V, key: K, collection: this) => Collection<K, T>, thisArg?: unknown): Collection<K, T> {
    const collections = this.map(fn, thisArg);
    return (new this.constructor[Symbol.species]() as Collection<K, T>).concat(...collections);
  }

  public map<T>(fn: (value: V, key: K, collection: this) => T): T[];
  public map<This, T>(fn: (this: This, value: V, key: K, collection: this) => T, thisArg: This): T[];
  public map<T>(fn: (value: V, key: K, collection: this) => T, thisArg?: unknown): T[] {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    const iter = this.entries();
    return Array.from({ length: this.size }, (): T => {
      const [key, value] = iter.next().value;
      return fn(value, key, this);
    });
  }

  public mapValues<T>(fn: (value: V, key: K, collection: this) => T): Collection<K, T>;
  public mapValues<This, T>(fn: (this: This, value: V, key: K, collection: this) => T, thisArg: This): Collection<K, T>;
  public mapValues<T>(fn: (value: V, key: K, collection: this) => T, thisArg?: unknown): Collection<K, T> {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    const coll = new this.constructor[Symbol.species]() as Collection<K, T>;
    for (const [key, val] of this) coll.set(key, fn(val, key, this));
    return coll;
  }

  public some(fn: (value: V, key: K, collection: this) => boolean): boolean;
  public some<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg: T): boolean;
  public some(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): boolean {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    for (const [key, val] of this) {
      if (fn(val, key, this)) return true;
    }
    return false;
  }

  public every(fn: (value: V, key: K, collection: this) => boolean): boolean;
  public every<T>(fn: (this: T, value: V, key: K, collection: this) => boolean, thisArg: T): boolean;
  public every(fn: (value: V, key: K, collection: this) => boolean, thisArg?: unknown): boolean {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    for (const [key, val] of this) {
      if (!fn(val, key, this)) return false;
    }
    return true;
  }

  public reduce<T>(fn: (accumulator: T, value: V, key: K, collection: this) => T, initialValue?: T): T {
    let accumulator!: T;

    if (typeof initialValue !== "undefined") {
      accumulator = initialValue;
      for (const [key, val] of this) accumulator = fn(accumulator, val, key, this);
      return accumulator;
    }
    let first = true;
    for (const [key, val] of this) {
      if (first) {
        accumulator = val as unknown as T;
        first = false;
        continue;
      }
      accumulator = fn(accumulator, val, key, this);
    }

    // No items iterated.
    if (first) {
      throw new TypeError("Reduce of empty collection with no initial value");
    }

    return accumulator;
  }

  public each(fn: (value: V, key: K, collection: this) => void): this;
  public each<T>(fn: (this: T, value: V, key: K, collection: this) => void, thisArg: T): this;
  public each(fn: (value: V, key: K, collection: this) => void, thisArg?: unknown): this {
    this.forEach(fn as (value: V, key: K, map: Map<K, V>) => void, thisArg);
    return this;
  }

  public tap(fn: (collection: this) => void): this;
  public tap<T>(fn: (this: T, collection: this) => void, thisArg: T): this;
  public tap(fn: (collection: this) => void, thisArg?: unknown): this {
    if (typeof thisArg !== "undefined") fn = fn.bind(thisArg);
    fn(this);
    return this;
  }

  public clone(): this {
    return new this.constructor[Symbol.species](this) as this;
  }

  public concat(...collections: Collection<K, V>[]): this {
    const newColl = this.clone();
    for (const coll of collections) {
      for (const [key, val] of coll) newColl.set(key, val);
    }
    return newColl;
  }

  public equals(collection: Collection<K, V>): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!collection) return false; // runtime check
    if (this === collection) return true;
    if (this.size !== collection.size) return false;
    for (const [key, value] of this) {
      if (!collection.has(key) || value !== collection.get(key)) {
        return false;
      }
    }
    return true;
  }

  public sort(
    compareFunction: (firstValue: V, secondValue: V, firstKey: K, secondKey: K) => number = (x, y): number =>
      Number(x > y) || Number(x === y) - 1
  ): this {
    const entries = [...this.entries()];
    entries.sort((a, b): number => compareFunction(a[1], b[1], a[0], b[0]));

    // Perform clean-up
    super.clear();

    // Set the new entries
    for (const [k, v] of entries) {
      super.set(k, v);
    }
    return this;
  }

  public intersect(other: Collection<K, V>): Collection<K, V> {
    return other.filter((_, k) => this.has(k));
  }

  public difference(other: Collection<K, V>): Collection<K, V> {
    return other.filter((_, k) => !this.has(k)).concat(this.filter((_, k) => !other.has(k)));
  }

  public sorted(
    compareFunction: (firstValue: V, secondValue: V, firstKey: K, secondKey: K) => number = (x, y): number =>
      Number(x > y) || Number(x === y) - 1
  ): this {
    return (new this.constructor[Symbol.species]([...this.entries()]) as this).sort((av, bv, ak, bk) =>
      compareFunction(av, bv, ak, bk)
    );
  }

  toJSON() {
    return this.map((e) =>
      typeof (e as any).toJSON === "function"
        ? (e as any).toJSON()
        : // @ts-ignore whatever
          Util.flatten(e)
    );
  }
}

export default Collection;
