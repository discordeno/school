export interface ClientOptions {
  shards?: number | number[] | "auto";
  shardCount?: number;
  messageCacheMaxSize?: number;
  messageCacheLifetime?: number;
  messageSweepInterval?: number;
  messageEditHistoryMaxSize?: number;
  fetchAllMembers?: boolean;
  disableMentions?: "none" | "all" | "everyone";
  allowedMentions?: MessageMentionOptions;
  partials?: PartialTypes[];
  restWsBridgeTimeout?: number;
  restTimeOffset?: number;
  restRequestTimeout?: number;
  restSweepInterval?: number;
  retryLimit?: number;
  presence?: PresenceData;
  ws?: WebSocketOptions;
  http?: HTTPOptions;
}

export type InviteResolvable = string;
export type Snowflake = string;
export type GuildTemplateResolvable = string;
