import { BitFieldResolvable } from "../../typings/mod.ts";
import { DJSError } from "../errors/mod.ts";

export class BitField<S extends string> {
  bitfield: number;
  constructor(bits?: BitFieldResolvable<S>) {
    // @ts-ignore
    this.bitfield = this.constructor.resolve(bits);
  }

  any(bit: BitFieldResolvable<S>) {
    // @ts-ignore
    return (this.bitfield & this.constructor.resolve(bit)) !== 0;
  }

  equals(bit: BitFieldResolvable<S>) {
    // @ts-ignore
    return this.bitfield === this.constructor.resolve(bit);
  }

  has(bit: BitFieldResolvable<S>): boolean {
    if (Array.isArray(bit)) return bit.every((p) => this.has(p));
    // @ts-ignore
    bit = this.constructor.resolve(bit);
    // @ts-ignore
    return (this.bitfield & bit) === bit;
  }

  missing(bits: BitFieldResolvable<S>[], ...hasParam: unknown[]): S[] {
    // @ts-ignore
    if (!Array.isArray(bits)) bits = new this.constructor(bits).toArray(false);
    // @ts-ignore
    return bits.filter((p) => !this.has(p, ...hasParams));
  }

  freeze() {
    return Object.freeze(this);
  }

  add(...bits: BitFieldResolvable<S>[]) {
    let total = 0;
    for (const bit of bits) {
      // @ts-ignore
      total |= this.constructor.resolve(bit);
    }
    // @ts-ignore
    if (Object.isFrozen(this)) return new this.constructor(this.bitfield | total);
    this.bitfield |= total;
    return this;
  }

  remove(...bits: BitFieldResolvable<S>[]) {
    let total = 0;
    for (const bit of bits) {
      // @ts-ignore
      total |= this.constructor.resolve(bit);
    }
    // @ts-ignore
    if (Object.isFrozen(this)) return new this.constructor(this.bitfield & ~total);
    this.bitfield &= ~total;
    return this;
  }

  serialize(...hasParams: unknown[]): Record<S, boolean> {
    const serialized = {};
    // @ts-ignore
    for (const [flag, bit] of Object.entries(this.constructor.FLAGS)) serialized[flag] = this.has(bit, ...hasParams);
    // @ts-ignore
    return serialized;
  }

  toArray(...hasParams: unknown[]): S[] {
    // @ts-ignore
    return Object.keys(this.constructor.FLAGS).filter((bit) => this.has(bit, ...hasParams));
  }

  toJSON() {
    return this.bitfield;
  }

  valueOf() {
    return this.bitfield;
  }

  *[Symbol.iterator]() {
    yield* this.toArray();
  }

  static resolve(bit: BitFieldResolvable<any> = 0): number {
    if (typeof bit === "number" && bit >= 0) return bit;
    if (bit instanceof BitField) return bit.bitfield;
    if (Array.isArray(bit)) return bit.map((p) => this.resolve(p)).reduce((prev, p) => prev | p, 0);
    // @ts-ignore
    if (typeof bit === "string" && typeof this.FLAGS[bit] !== "undefined") return this.FLAGS[bit];
    const error = new DJSError.RangeError("BITFIELD_INVALID");
    error.bit = bit;
    throw error;
  }
}

// @ts-ignore
BitField.FLAGS = {};

export default BitField;
