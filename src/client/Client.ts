import BaseClient from "./BaseClient.ts";
import ActionsManager from "./actions/ActionsManager.ts";
import ClientVoiceManager from "./voice/ClientVoiceManager.ts";
import WebSocketManager from "./websocket/WebSocketManager.ts";
import { Error, TypeError, RangeError } from "../errors.ts";
import ChannelManager from "../managers/ChannelManager.ts";
import GuildEmojiManager from "../managers/GuildEmojiManager.ts";
import GuildManager from "../managers/GuildManager.ts";
import UserManager from "../managers/UserManager.ts";
import ShardClientUtil from "../sharding/ShardClientUtil.ts";
import ClientApplication from "../structures/ClientApplication.ts";
import GuildPreview from "../structures/GuildPreview.ts";
import GuildTemplate from "../structures/GuildTemplate.ts";
import Invite from "../structures/Invite.ts";
import VoiceRegion from "../structures/VoiceRegion.ts";
import Webhook from "../structures/Webhook.ts";
import Collection from "../util/Collection.ts";
import { Events, browser, DefaultOptions } from "../util/Constants.ts";
import DataResolver from "../util/DataResolver.ts";
import Intents from "../util/Intents.ts";
import Permissions from "../util/Permissions.ts";
import Structures from "../util/Structures.ts";
import { ClientOptions } from "../typings/client_options.ts";
import ClientUser from "./structures/ClientUser";
import ClientPresence from "../structures/ClientPresence";
import { InviteResolvable } from "../../typings/mod";
import { Snowflake } from "../../typings/mod";
import { GuildTemplateResolvable } from "../../typings/mod";

export class Client extends BaseClient {
  channels: ChannelManager;
  guilds: GuildManager;
  readyAt: Date | null = new Date();
  shard: ShardClientUtil;
  token: string | null;
  user: ClientUser | null;
  users: UserManager;
  voice: ClientVoiceManager;
  ws: WebSocketManager;
  actions: ActionsManager;
  presence: ClientPresence;

  constructor(options: ClientOptions) {
    super(Object.assign({ _tokenType: "Bot" }, options));

    // Obtain shard details from environment or if present, worker threads
    const [SHARDS, SHARD_COUNT] = [Deno.env.get("SHARDS"), Deno.env.get("SHARD_COUNT")];

    if (this.options.shards === DefaultOptions.shards && SHARDS) {
      this.options.shards = JSON.parse(SHARDS);
    }

    if (this.options.shardCount === DefaultOptions.shardCount) {
      if (SHARD_COUNT) {
        this.options.shardCount = Number(SHARD_COUNT);
      } else if (Array.isArray(this.options.shards)) {
        this.options.shardCount = this.options.shards.length;
      }
    }

    const typeofShards = typeof this.options.shards;

    if (typeofShards === "undefined" && typeof this.options.shardCount === "number") {
      this.options.shards = Array.from({ length: this.options.shardCount }, (_, i) => i);
    }

    if (typeofShards === "number") this.options.shards = [this.options.shards as number];

    if (Array.isArray(this.options.shards)) {
      this.options.shards = [
        ...new Set(
          this.options.shards.filter(
            (item: number) => !isNaN(item) && item >= 0 && item < Infinity && item === (item | 0)
          )
        ),
      ];
    }

    this.validateOptions();

    this.ws = new WebSocketManager(this);
    this.actions = new ActionsManager(this);
    this.voice = !browser ? new ClientVoiceManager(this) : null;
    this.shard =
      !browser && Deno.env.get("SHARDING_MANAGER")
        ? ShardClientUtil.singleton(this, Deno.env.get("SHARDING_MANAGER_MODE"))
        : null;
    this.users = new UserManager(this);
    this.guilds = new GuildManager(this);
    this.channels = new ChannelManager(this);
    this.presence = new Structures.get("ClientPresence")(this);

    Object.defineProperty(this, "token", { writable: true });
    if (!browser && Deno.env.get("DISCORD_TOKEN")) {
      this.token = Deno.env.get("DISCORD_TOKEN")!;
    } else {
      this.token = null;
    }

    this.user = null;
    this.readyAt = null;

    if (this.options.messageSweepInterval && this.options.messageSweepInterval > 0) {
      this.setInterval(this.sweepMessages.bind(this), this.options.messageSweepInterval * 1000);
    }
  }

  get emojis(): GuildEmojiManager {
    const emojis = new GuildEmojiManager({ client: this });
    for (const guild of this.guilds.cache.values()) {
      if (guild.available) for (const emoji of guild.emojis.cache.values()) emojis.cache.set(emoji.id, emoji);
    }
    return emojis;
  }

  get readyTimestamp(): number | null {
    return this.readyAt ? this.readyAt.getTime() : null;
  }

  get uptime(): number | null {
    return this.readyTimestamp ? Date.now() - this.readyTimestamp : null;
  }

  async login(token: string | null = this.token): Promise<string> {
    if (!token || typeof token !== "string") throw new Error("TOKEN_INVALID");
    this.token = token = token.replace(/^(Bot|Bearer)\s*/i, "");
    this.emit(
      Events.DEBUG,
      `Provided token: ${token
        .split(".")
        .map((val, i) => (i > 1 ? val.replace(/./g, "*") : val))
        .join(".")}`
    );

    if (this.options.presence) {
      this.options.ws.presence = await this.presence._parse(this.options.presence);
    }

    this.emit(Events.DEBUG, "Preparing to connect to the gateway...");

    try {
      await this.ws.connect();
      return this.token;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  destroy() {
    super.destroy();
    this.ws.destroy();
    this.token = null;
  }

  fetchInvite(invite: InviteResolvable): Promise<Invite> {
    const code = DataResolver.resolveInviteCode(invite);
    return this.api
      .invites(code)
      .get({ query: { with_counts: true } })
      .then((data: Record<string, unknown>) => new Invite(this, data));
  }

  fetchGuildTemplate(template: GuildTemplateResolvable): Promise<GuildTemplate> {
    const code = DataResolver.resolveGuildTemplateCode(template);
    return this.api.guilds
      .templates(code)
      .get()
      .then((data: Record<string, unknown>) => new GuildTemplate(this, data));
  }

  fetchWebhook(id: Snowflake, token: string): Promise<Webhook> {
    return this.api
      .webhooks(id, token)
      .get()
      .then((data: Record<string, unknown>) => new Webhook(this, data));
  }

  fetchVoiceRegions() {
    return this.api.voice.regions.get().then((res: Record<string, unknown>[]) => {
      const regions = new Collection();
      for (const region of res) regions.set(region.id, new VoiceRegion(region));
      return regions;
    });
  }

  sweepMessages(lifetime = this.options.messageCacheLifetime) {
    if (typeof lifetime !== "number" || isNaN(lifetime)) {
      throw new TypeError("INVALID_TYPE", "lifetime", "number");
    }
    if (lifetime <= 0) {
      this.emit(Events.DEBUG, "Didn't sweep messages - lifetime is unlimited");
      return -1;
    }

    const lifetimeMs = lifetime * 1000;
    const now = Date.now();
    let channels = 0;
    let messages = 0;

    for (const channel of this.channels.cache.values()) {
      if (!channel.messages) continue;
      channels++;

      messages += channel.messages.cache.sweep(
        (message) => now - (message.editedTimestamp || message.createdTimestamp) > lifetimeMs
      );
    }

    this.emit(
      Events.DEBUG,
      `Swept ${messages} messages older than ${lifetime} seconds in ${channels} text-based channels`
    );
    return messages;
  }

  fetchApplication() {
    return this.api.oauth2
      .applications("@me")
      .get()
      .then((app) => new ClientApplication(this, app));
  }

  fetchGuildPreview(guild) {
    const id = this.guilds.resolveID(guild);
    if (!id) throw new TypeError("INVALID_TYPE", "guild", "GuildResolvable");
    return this.api
      .guilds(id)
      .preview.get()
      .then((data) => new GuildPreview(this, data));
  }

  async generateInvite(options = {}) {
    const application = await this.fetchApplication();
    const query = new URLSearchParams({
      client_id: application.id,
      permissions: Permissions.resolve(options.permissions),
      scope: "bot",
    });
    if (typeof options.disableGuildSelect === "boolean") {
      query.set("disable_guild_select", options.disableGuildSelect.toString());
    }
    if (typeof options.guild !== "undefined") {
      const guildID = this.guilds.resolveID(options.guild);
      if (!guildID) throw new TypeError("INVALID_TYPE", "options.guild", "GuildResolvable");
      query.set("guild_id", guildID);
    }
    return `${this.options.http.api}${this.api.oauth2.authorize}?${query}`;
  }

  toJSON() {
    return super.toJSON({
      readyAt: false,
    });
  }

  eval(script: string): unknown {
    return eval(script);
  }

  validateOptions(options = this.options) {
    if (typeof options.ws.intents !== "undefined") {
      options.ws.intents = Intents.resolve(options.ws.intents);
    }
    if (typeof options.shardCount !== "number" || isNaN(options.shardCount) || options.shardCount < 1) {
      throw new TypeError("CLIENT_INVALID_OPTION", "shardCount", "a number greater than or equal to 1");
    }
    if (options.shards && !(options.shards === "auto" || Array.isArray(options.shards))) {
      throw new TypeError("CLIENT_INVALID_OPTION", "shards", "'auto', a number or array of numbers");
    }
    if (options.shards && !options.shards.length) throw new RangeError("CLIENT_INVALID_PROVIDED_SHARDS");
    if (typeof options.messageCacheMaxSize !== "number" || isNaN(options.messageCacheMaxSize)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "messageCacheMaxSize", "a number");
    }
    if (typeof options.messageCacheLifetime !== "number" || isNaN(options.messageCacheLifetime)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "The messageCacheLifetime", "a number");
    }
    if (typeof options.messageSweepInterval !== "number" || isNaN(options.messageSweepInterval)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "messageSweepInterval", "a number");
    }
    if (
      typeof options.messageEditHistoryMaxSize !== "number" ||
      isNaN(options.messageEditHistoryMaxSize) ||
      options.messageEditHistoryMaxSize < -1
    ) {
      throw new TypeError("CLIENT_INVALID_OPTION", "messageEditHistoryMaxSize", "a number greater than or equal to -1");
    }
    if (typeof options.fetchAllMembers !== "boolean") {
      throw new TypeError("CLIENT_INVALID_OPTION", "fetchAllMembers", "a boolean");
    }
    if (typeof options.disableMentions !== "string") {
      throw new TypeError("CLIENT_INVALID_OPTION", "disableMentions", "a string");
    }
    if (!Array.isArray(options.partials)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "partials", "an Array");
    }
    if (typeof options.restWsBridgeTimeout !== "number" || isNaN(options.restWsBridgeTimeout)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "restWsBridgeTimeout", "a number");
    }
    if (typeof options.restRequestTimeout !== "number" || isNaN(options.restRequestTimeout)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "restRequestTimeout", "a number");
    }
    if (typeof options.restSweepInterval !== "number" || isNaN(options.restSweepInterval)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "restSweepInterval", "a number");
    }
    if (typeof options.retryLimit !== "number" || isNaN(options.retryLimit)) {
      throw new TypeError("CLIENT_INVALID_OPTION", "retryLimit", "a number");
    }
  }
}

export default Client;
