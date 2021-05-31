// Heavily inspired by node's `internal/errors` module

const kCode = Symbol("code");
const messages = new Map();

function makeDiscordjsError(Base: any) {
  return class DiscordjsError extends Base {
    constructor(key: string, ...args: unknown[]) {
      super(message(key, args));
      // @ts-ignore okay
      this[kCode] = key;
      if (Error.captureStackTrace) Error.captureStackTrace(this, DiscordjsError);
    }

    get name() {
      // @ts-ignore okay
      return `${super.name} [${this[kCode]}]`;
    }

    get code() {
      // @ts-ignore okay
      return this[kCode];
    }
  };
}

function message(key: string, args: unknown[]): string {
  if (typeof key !== "string") throw new Error("Error message key must be a string");
  const msg = messages.get(key);
  if (!msg) throw new Error(`An invalid error message key was used: ${key}.`);
  if (typeof msg === "function") return msg(...args);
  if (args === undefined || args.length === 0) return msg;
  args.unshift(msg);
  return String(...args);
}

function register(sym: string, val: unknown): void {
  messages.set(sym, typeof val === "function" ? val : String(val));
}

export const DJSError = {
  register,
  // @ts-ignore whatever
  Error: makeDiscordjsError(Error),
  // @ts-ignore whatever
  TypeError: makeDiscordjsError(TypeError),
  // @ts-ignore whatever
  RangeError: makeDiscordjsError(RangeError),
};

export default DJSError;
