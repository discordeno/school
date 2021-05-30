class DiscordAPIError extends Error {
  code: number;
  method: string;
  path: string;
  httpStatus: number;

  constructor(path: string, error: Record<string, unknown>, method: string, status: number) {
    super();
    // @ts-ignore okay then
    const flattened = this.constructor.flattenErrors(error.errors || error).join("\n");
    this.name = "DiscordAPIError";
    this.message = error.message && flattened ? `${error.message}\n${flattened}` : error.message || flattened;

    this.method = method;
    this.path = path;
    this.code = error.code as number;
    this.httpStatus = status;
  }

  // deno-lint-ignore no-explicit-any
  static flattenErrors(obj: Record<string, any>, key = "") {
    let messages: string[] = [];

    for (const [k, v] of Object.entries(obj)) {
      if (k === "message") continue;
      // @ts-ignore umm ok
      const newKey = key ? (isNaN(k) ? `${key}.${k}` : `${key}[${k}]`) : k;

      if (v._errors) {
        // @ts-ignore umm ok
        messages.push(`${newKey}: ${v._errors.map((e) => e.message).join(" ")}`);
      } else if (v.code || v.message) {
        messages.push(`${v.code ? `${v.code}: ` : ""}${v.message}`.trim());
      } else if (typeof v === "string") {
        messages.push(v);
      } else {
        messages = messages.concat(this.flattenErrors(v, newKey));
      }
    }

    return messages;
  }
}

export default DiscordAPIError;
