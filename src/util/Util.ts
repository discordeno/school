import { parse, Buffer } from "../../deps.ts";
import { Colors, DefaultOptions, Endpoints } from "./Constants.ts";
import { DJSError } from "../errors/mod.ts";
import { ColorResolvable, Snowflake, StringResolvable } from "../../typings/mod.ts";
import Collection from "./Collection.ts";
import Channel from "../structures/Channel.ts";

const has = (o: unknown, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = (d: unknown) => typeof d === "object" && d !== null;

export class Util {
  constructor() {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
  }

  static flatten(obj: Record<string, unknown>, ...props: Record<string, boolean | string>[]): Record<string, unknown> {
    if (!isObject(obj)) return obj;

    const objProps = Object.keys(obj)
      .filter((k) => !k.startsWith("_"))
      .map((k) => ({ [k]: true }));

    // @ts-ignore js prowess
    const finalProps = objProps.length ? Object.assign(...objProps, ...props) : Object.assign({}, ...props);

    const out: Record<string, unknown> = {};

    for (const [prop, newProp] of Object.entries(finalProps)) {
      if (!newProp) continue;
      const property = newProp === true ? prop : (newProp as string);

      const element = obj[prop];
      const elemIsObj = isObject(element);
      // @ts-ignore ok
      const valueOf = elemIsObj && typeof element.valueOf === "function" ? element.valueOf() : null;

      // If it's a Collection, make the array of keys
      if (element instanceof Collection) out[property] = Array.from(element.keys());
      // If the valueOf is a Collection, use its array of keys
      else if (valueOf instanceof Collection) out[property] = Array.from(valueOf.keys());
      // If it's an array, flatten each element
      else if (Array.isArray(element)) out[property] = element.map((e) => Util.flatten(e));
      // If it's an object with a primitive `valueOf`, use that value
      else if (typeof valueOf !== "object") out[property] = valueOf;
      // If it's a primitive
      else if (!elemIsObj) out[property] = element;
    }

    return out;
  }

  static splitMessage(text: string, { maxLength = 2000, char = "\n", prepend = "", append = "" } = {}): string[] {
    text = Util.resolveString(text);
    if (text.length <= maxLength) return [text];
    const splitText = text.split(char);
    if (splitText.some((chunk) => chunk.length > maxLength)) throw new DJSError.RangeError("SPLIT_MAX_LEN");
    const messages = [];
    let msg = "";
    for (const chunk of splitText) {
      if (msg && (msg + char + chunk + append).length > maxLength) {
        messages.push(msg + append);
        msg = prepend;
      }
      msg += (msg && msg !== prepend ? char : "") + chunk;
    }
    return messages.concat(msg).filter((m) => m);
  }

  static escapeMarkdown(
    text: string,
    {
      codeBlock = true,
      inlineCode = true,
      bold = true,
      italic = true,
      underline = true,
      strikethrough = true,
      spoiler = true,
      codeBlockContent = true,
      inlineCodeContent = true,
    } = {}
  ): string {
    if (!codeBlockContent) {
      return text
        .split("```")
        .map((subString, index, array) => {
          if (index % 2 && index !== array.length - 1) return subString;
          return Util.escapeMarkdown(subString, {
            inlineCode,
            bold,
            italic,
            underline,
            strikethrough,
            spoiler,
            inlineCodeContent,
          });
        })
        .join(codeBlock ? "\\`\\`\\`" : "```");
    }
    if (!inlineCodeContent) {
      return text
        .split(/(?<=^|[^`])`(?=[^`]|$)/g)
        .map((subString, index, array) => {
          if (index % 2 && index !== array.length - 1) return subString;
          return Util.escapeMarkdown(subString, {
            codeBlock,
            bold,
            italic,
            underline,
            strikethrough,
            spoiler,
          });
        })
        .join(inlineCode ? "\\`" : "`");
    }
    if (inlineCode) text = Util.escapeInlineCode(text);
    if (codeBlock) text = Util.escapeCodeBlock(text);
    if (italic) text = Util.escapeItalic(text);
    if (bold) text = Util.escapeBold(text);
    if (underline) text = Util.escapeUnderline(text);
    if (strikethrough) text = Util.escapeStrikethrough(text);
    if (spoiler) text = Util.escapeSpoiler(text);
    return text;
  }

  static escapeCodeBlock(text: string): string {
    return text.replace(/```/g, "\\`\\`\\`");
  }

  static escapeInlineCode(text: string): string {
    return text.replace(/(?<=^|[^`])`(?=[^`]|$)/g, "\\`");
  }

  static escapeItalic(text: string): string {
    let i = 0;
    text = text.replace(/(?<=^|[^*])\*([^*]|\*\*|$)/g, (_, match) => {
      if (match === "**") return ++i % 2 ? `\\*${match}` : `${match}\\*`;
      return `\\*${match}`;
    });
    i = 0;
    return text.replace(/(?<=^|[^_])_([^_]|__|$)/g, (_, match) => {
      if (match === "__") return ++i % 2 ? `\\_${match}` : `${match}\\_`;
      return `\\_${match}`;
    });
  }

  static escapeBold(text: string): string {
    let i = 0;
    return text.replace(/\*\*(\*)?/g, (_, match) => {
      if (match) return ++i % 2 ? `${match}\\*\\*` : `\\*\\*${match}`;
      return "\\*\\*";
    });
  }

  static escapeUnderline(text: string): string {
    let i = 0;
    return text.replace(/__(_)?/g, (_, match) => {
      if (match) return ++i % 2 ? `${match}\\_\\_` : `\\_\\_${match}`;
      return "\\_\\_";
    });
  }

  static escapeStrikethrough(text: string): string {
    return text.replace(/~~/g, "\\~\\~");
  }

  static escapeSpoiler(text: string): string {
    return text.replace(/\|\|/g, "\\|\\|");
  }

  static fetchRecommendedShards(token: string, guildsPerShard = 1000) {
    if (!token) throw new DJSError.Error("TOKEN_MISSING");
    ("TOKEN_MISSING");
    return fetch(`${DefaultOptions.http.api}/v${DefaultOptions.http.version}${Endpoints.botGateway}`, {
      method: "GET",
      headers: { Authorization: `Bot ${token.replace(/^Bot\s*/i, "")}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 401) throw new DJSError.Error("TOKEN_INVALID");
        throw res;
      })
      .then((data) => data.shards * (1000 / guildsPerShard));
  }

  static parseEmoji(text: string): { animated: boolean; name: string; id: string | null } | null {
    if (text.includes("%")) text = decodeURIComponent(text);
    if (!text.includes(":")) return { animated: false, name: text, id: null };
    const m = text.match(/<?(?:(a):)?(\w{2,32}):(\d{17,19})?>?/);
    if (!m) return null;
    return { animated: Boolean(m[1]), name: m[2], id: m[3] || null };
  }

  static cloneObject(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.assign(Object.create(obj), obj);
  }

  static mergeDefault(def: Record<string, unknown>, given: Record<string, unknown>): Record<string, unknown> {
    if (!given) return def;
    for (const key in def) {
      if (!has(given, key) || given[key] === undefined) {
        given[key] = def[key];
      } else if (given[key] === Object(given[key])) {
        // @ts-ignore js prowess here
        given[key] = Util.mergeDefault(def[key], given[key]);
      }
    }

    return given;
  }

  static convertToBuffer(ab: ArrayBuffer | string): Buffer {
    if (typeof ab === "string") ab = Util.str2ab(ab);
    return Buffer.from(ab);
  }

  static str2ab(str: string): ArrayBuffer {
    const buffer = new ArrayBuffer(str.length * 2);
    const view = new Uint16Array(buffer);
    const strLen = str.length;
    for (let i = 0; i < strLen; i++) view[i] = str.charCodeAt(i);
    return buffer;
  }

  static makeError(obj: Error) {
    const err = new Error(obj.message);
    err.name = obj.name;
    err.stack = obj.stack;
    return err;
  }

  static makePlainError(err: Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  static moveElementInArray(array: unknown[], element: unknown, newIndex: number, offset = false): number {
    const index = array.indexOf(element);
    newIndex = (offset ? index : 0) + newIndex;
    if (newIndex > -1 && newIndex < array.length) {
      const removedElement = array.splice(index, 1)[0];
      array.splice(newIndex, 0, removedElement);
    }
    return array.indexOf(element);
  }

  static resolveString(data: StringResolvable) {
    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.join("\n");
    return String(data);
  }

  static resolveColor(color: ColorResolvable): number {
    if (typeof color === "string") {
      if (color === "RANDOM") return Math.floor(Math.random() * (0xffffff + 1));
      if (color === "DEFAULT") return 0;
      // @ts-ignore ok
      color = Colors[color] || parseInt(color.replace("#", ""), 16);
    } else if (Array.isArray(color)) {
      color = (color[0] << 16) + (color[1] << 8) + color[2];
    }

    if (color < 0 || color > 0xffffff) throw new DJSError.RangeError("COLOR_RANGE");
    // @ts-ignore js prowess
    else if (color && isNaN(color)) throw new DJSError.TypeError("COLOR_CONVERT");

    return color as number;
  }

  static discordSort(collection: Collection<string, any>) {
    return collection.sorted(
      (a, b) =>
        a.rawPosition - b.rawPosition ||
        parseInt(b.id.slice(0, -10)) - parseInt(a.id.slice(0, -10)) ||
        parseInt(b.id.slice(10)) - parseInt(a.id.slice(10))
    );
  }

  static setPosition(
    item: Channel | Role,
    position: number,
    relative: boolean,
    sorted: Collection<string, Channel | Role>,
    route: APIRouter,
    reason: string
  ): Promise<Record<string, unknown>[]> {
    let updatedItems = sorted.array();
    Util.moveElementInArray(updatedItems, item, position, relative);
    updatedItems = updatedItems.map((r, i) => ({ id: r.id, position: i }));
    return route.patch({ data: updatedItems, reason }).then(() => updatedItems);
  }

  static basename(path: string, ext: string): string {
    const res = parse(path);
    return ext && res.ext.startsWith(ext) ? res.name : res.base.split("?")[0];
  }

  static idToBinary(num: Snowflake) {
    let bin = "";
    let high = parseInt(num.slice(0, -10)) || 0;
    let low = parseInt(num.slice(-10));
    while (low > 0 || high > 0) {
      bin = String(low & 1) + bin;
      low = Math.floor(low / 2);
      if (high > 0) {
        low += 5000000000 * (high % 2);
        high = Math.floor(high / 2);
      }
    }
    return bin;
  }

  static binaryToID(number: string): Snowflake {
    let dec = "";
    let num: string | number = number;

    while (num.length > 50) {
      const high = parseInt(num.slice(0, -32), 2);
      const low = parseInt((high % 10).toString(2) + num.slice(-32), 2);

      dec = (low % 10).toString() + dec;
      num =
        Math.floor(high / 10).toString(2) +
        Math.floor(low / 10)
          .toString(2)
          .padStart(32, "0");
    }

    num = parseInt(num, 2);
    while (num > 0) {
      dec = (num % 10).toString() + dec;
      num = Math.floor(num / 10);
    }

    return dec;
  }

  static removeMentions(str: string): string {
    return str.replace(/@/g, "@\u200b");
  }

  static cleanContent(str: string, message: Message): string {
    str = str
      .replace(/<@!?[0-9]+>/g, (input) => {
        const id = input.replace(/<|!|>|@/g, "");
        if (message.channel.type === "dm") {
          const user = message.client.users.cache.get(id);
          return user ? Util.removeMentions(`@${user.username}`) : input;
        }

        const member = message.channel.guild.members.cache.get(id);
        if (member) {
          return Util.removeMentions(`@${member.displayName}`);
        } else {
          const user = message.client.users.cache.get(id);
          return user ? Util.removeMentions(`@${user.username}`) : input;
        }
      })
      .replace(/<#[0-9]+>/g, (input) => {
        const channel = message.client.channels.cache.get(input.replace(/<|#|>/g, ""));
        return channel ? `#${channel.name}` : input;
      })
      .replace(/<@&[0-9]+>/g, (input) => {
        if (message.channel.type === "dm") return input;
        const role = message.guild.roles.cache.get(input.replace(/<|@|>|&/g, ""));
        return role ? `@${role.name}` : input;
      });
    if (message.client.options.disableMentions === "everyone") {
      str = str.replace(/@([^<>@ ]*)/gmsu, (_match, target) => {
        if (target.match(/^[&!]?\d+$/)) {
          return `@${target}`;
        } else {
          return `@\u200b${target}`;
        }
      });
    }
    if (message.client.options.disableMentions === "all") {
      return Util.removeMentions(str);
    } else {
      return str;
    }
  }

  static cleanCodeBlockContent(text: string): string {
    return text.replace(/```/g, "`\u200b``");
  }

  static delayFor(ms: number): Promise<unknown> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

export default Util;
