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
  /** All of the Channels that the client is currently handling, mapped by their IDs - as long as sharding isn't being used, this will be every channel in every guild the bot is a member of. Note that DM channels will not be initially cached, and thus not be present in the Manager without their explicit fetching or use. */
  channels: ChannelManager;
  /** All of the guilds the client is currently handling, mapped by their IDs - as long as sharding isn't being used, this will be every guild the bot is a member of */
  guilds: GuildManager;
  /** Time at which the client was last regarded as being in the READY state (each time the client disconnects and successfully reconnects, this will be overwritten) */
  readyAt: Date | null = new Date();
  /** Shard helpers for the client (only if the process was spawned from a ShardingManager) */
  shard: ShardClientUtil;
  /** Authorization token for the logged in bot. If present, this defaults to process.env.DISCORD_TOKEN when instantiating the client. This should be kept private at all times. */
  token: string | null;
  /** User that the client is logged in as */
  user: ClientUser | null;
  /** All of the User objects that have been cached at any point, mapped by their IDs */
  users: UserManager;
  /** The voice manager of the client (null in browsers) */
  voice: ClientVoiceManager;
  /** The WebSocket manager of the client */
  ws: WebSocketManager;
  actions: ActionsManager;
  #presence: ClientPresence;

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

    this.#validateOptions();

    /**
     * The WebSocket manager of the client
     * @type {WebSocketManager}
     */
    this.ws = new WebSocketManager(this);

    /**
     * The action manager of the client
     * @type {ActionsManager}
     * @private
     */
    this.actions = new ActionsManager(this);

    /**
     * The voice manager of the client (`null` in browsers)
     * @type {?ClientVoiceManager}
     */
    this.voice = !browser ? new ClientVoiceManager(this) : null;

    /**
     * Shard helpers for the client (only if the process was spawned from a {@link ShardingManager})
     * @type {?ShardClientUtil}
     */
    this.shard =
      !browser && Deno.env.get("SHARDING_MANAGER")
        ? ShardClientUtil.singleton(this, Deno.env.get("SHARDING_MANAGER_MODE"))
        : null;

    /**
     * All of the {@link User} objects that have been cached at any point, mapped by their IDs
     * @type {UserManager}
     */
    this.users = new UserManager(this);

    /**
     * All of the guilds the client is currently handling, mapped by their IDs -
     * as long as sharding isn't being used, this will be *every* guild the bot is a member of
     * @type {GuildManager}
     */
    this.guilds = new GuildManager(this);

    /**
     * All of the {@link Channel}s that the client is currently handling, mapped by their IDs -
     * as long as sharding isn't being used, this will be *every* channel in *every* guild the bot
     * is a member of. Note that DM channels will not be initially cached, and thus not be present
     * in the Manager without their explicit fetching or use.
     * @type {ChannelManager}
     */
    this.channels = new ChannelManager(this);

    /**
     * The presence of the Client
     * @private
     * @type {ClientPresence}
     */
    this.#presence = new Structures.get("ClientPresence")(this);

    Object.defineProperty(this, "token", { writable: true });
    if (!browser && Deno.env.get("DISCORD_TOKEN")) {
      /**
       * Authorization token for the logged in bot.
       * If present, this defaults to `process.env.DISCORD_TOKEN` when instantiating the client
       * <warn>This should be kept private at all times.</warn>
       * @type {?string}
       */
      this.token = Deno.env.get("DISCORD_TOKEN")!;
    } else {
      this.token = null;
    }

    /**
     * User that the client is logged in as
     * @type {?ClientUser}
     */
    this.user = null;

    /**
     * Time at which the client was last regarded as being in the `READY` state
     * (each time the client disconnects and successfully reconnects, this will be overwritten)
     * @type {?Date}
     */
    this.readyAt = null;

    if (this.options.messageSweepInterval && this.options.messageSweepInterval > 0) {
      this.setInterval(this.sweepMessages.bind(this), this.options.messageSweepInterval * 1000);
    }
  }

  /**
   * All custom emojis that the client has access to, mapped by their IDs
   * @type {GuildEmojiManager}
   * @readonly
   */
  get emojis(): GuildEmojiManager {
    const emojis = new GuildEmojiManager({ client: this });
    for (const guild of this.guilds.cache.values()) {
      if (guild.available) for (const emoji of guild.emojis.cache.values()) emojis.cache.set(emoji.id, emoji);
    }
    return emojis;
  }

  /**
   * Timestamp of the time the client was last `READY` at
   * @type {?number}
   * @readonly
   */
  get readyTimestamp(): number | null {
    return this.readyAt ? this.readyAt.getTime() : null;
  }

  /**
   * How long it has been since the client last entered the `READY` state in milliseconds
   * @type {?number}
   * @readonly
   */
  get uptime(): number | null {
    return this.readyTimestamp ? Date.now() - this.readyTimestamp : null;
  }

  /**
   * Logs the client in, establishing a websocket connection to Discord.
   * @param {string} [token=this.token] Token of the account to log in with
   * @returns {Promise<string>} Token of the account used
   * @example
   * client.login('my token');
   */
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
      this.options.ws.presence = await this.#presence._parse(this.options.presence);
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

  /**
   * Logs out, terminates the connection to Discord, and destroys the client.
   * @returns {void}
   */
  destroy() {
    super.destroy();
    this.ws.destroy();
    this.token = null;
  }

  /**
   * Obtains an invite from Discord.
   * @param {InviteResolvable} invite Invite code or URL
   * @returns {Promise<Invite>}
   * @example
   * client.fetchInvite('https://discord.gg/bRCvFy9')
   *   .then(invite => console.log(`Obtained invite with code: ${invite.code}`))
   *   .catch(console.error);
   */
  fetchInvite(invite: InviteResolvable): Promise<Invite> {
    const code = DataResolver.resolveInviteCode(invite);
    return this.api
      .invites(code)
      .get({ query: { with_counts: true } })
      .then((data: Record<string, unknown>) => new Invite(this, data));
  }

  /**
   * Obtains a template from Discord.
   * @param {GuildTemplateResolvable} template Template code or URL
   * @returns {Promise<GuildTemplate>}
   * @example
   * client.fetchGuildTemplate('https://discord.new/FKvmczH2HyUf')
   *   .then(template => console.log(`Obtained template with code: ${template.code}`))
   *   .catch(console.error);
   */
  fetchGuildTemplate(template: GuildTemplateResolvable): Promise<GuildTemplate> {
    const code = DataResolver.resolveGuildTemplateCode(template);
    return this.api.guilds
      .templates(code)
      .get()
      .then((data: Record<string, unknown>) => new GuildTemplate(this, data));
  }

  /**
   * Obtains a webhook from Discord.
   * @param {Snowflake} id ID of the webhook
   * @param {string} [token] Token for the webhook
   * @returns {Promise<Webhook>}
   * @example
   * client.fetchWebhook('id', 'token')
   *   .then(webhook => console.log(`Obtained webhook with name: ${webhook.name}`))
   *   .catch(console.error);
   */
  fetchWebhook(id: Snowflake, token: string): Promise<Webhook> {
    return this.api
      .webhooks(id, token)
      .get()
      .then((data: Record<string, unknown>) => new Webhook(this, data));
  }

  /**
   * Obtains the available voice regions from Discord.
   * @returns {Promise<Collection<string, VoiceRegion>>}
   * @example
   * client.fetchVoiceRegions()
   *   .then(regions => console.log(`Available regions are: ${regions.map(region => region.name).join(', ')}`))
   *   .catch(console.error);
   */
  fetchVoiceRegions() {
    return this.api.voice.regions.get().then((res: Record<string, unknown>[]) => {
      const regions = new Collection();
      for (const region of res) regions.set(region.id, new VoiceRegion(region));
      return regions;
    });
  }

  /**
   * Sweeps all text-based channels' messages and removes the ones older than the max message lifetime.
   * If the message has been edited, the time of the edit is used rather than the time of the original message.
   * @param {number} [lifetime=this.options.messageCacheLifetime] Messages that are older than this (in seconds)
   * will be removed from the caches. The default is based on {@link ClientOptions#messageCacheLifetime}
   * @returns {number} Amount of messages that were removed from the caches,
   * or -1 if the message cache lifetime is unlimited
   * @example
   * // Remove all messages older than 1800 seconds from the messages cache
   * const amount = client.sweepMessages(1800);
   * console.log(`Successfully removed ${amount} messages from the cache.`);
   */
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

  /**
   * Obtains the OAuth Application of this bot from Discord.
   * @returns {Promise<ClientApplication>}
   */
  fetchApplication() {
    return this.api.oauth2
      .applications("@me")
      .get()
      .then((app) => new ClientApplication(this, app));
  }

  /**
   * Obtains a guild preview from Discord, available for all guilds the bot is in and all Discoverable guilds.
   * @param {GuildResolvable} guild The guild to fetch the preview for
   * @returns {Promise<GuildPreview>}
   */
  fetchGuildPreview(guild) {
    const id = this.guilds.resolveID(guild);
    if (!id) throw new TypeError("INVALID_TYPE", "guild", "GuildResolvable");
    return this.api
      .guilds(id)
      .preview.get()
      .then((data) => new GuildPreview(this, data));
  }

  /**
   * Generates a link that can be used to invite the bot to a guild.
   * @param {InviteGenerationOptions|PermissionResolvable} [options] Permissions to request
   * @returns {Promise<string>}
   * @example
   * client.generateInvite({
   *   permissions: ['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE'],
   * })
   *   .then(link => console.log(`Generated bot invite link: ${link}`))
   *   .catch(console.error);
   */
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

  /**
   * Calls {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval} on a script
   * with the client as `this`.
   * @param {string} script Script to eval
   * @returns {*}
   * @private
   */
  #eval(script: string): unknown {
    return eval(script);
  }

  /**
   * Validates the client options.
   * @param {ClientOptions} [options=this.options] Options to validate
   * @private
   */
  #validateOptions(options = this.options) {
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
