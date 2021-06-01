import Channel from "../src/structures/Channel.ts";

export interface ClientOptions {
  shards: number | number[] | "auto";
  shardCount: number;
  messageCacheMaxSize: number;
  messageCacheLifetime: number;
  messageSweepInterval: number;
  messageEditHistoryMaxSize: number;
  fetchAllMembers: boolean;
  disableMentions: "none" | "all" | "everyone";
  allowedMentions: MessageMentionOptions;
  partials: PartialTypes[];
  restWsBridgeTimeout: number;
  restTimeOffset: number;
  restRequestTimeout: number;
  restSweepInterval: number;
  retryLimit: number;
  presence: PresenceData;
  ws: WebSocketOptions;
  http: HTTPOptions;
}

export type InviteResolvable = string;
export type Snowflake = string;
export type GuildTemplateResolvable = string;
export type StringResolvable = string | string[] | any;
export type ColorResolvable =
  | "DEFAULT"
  | "WHITE"
  | "AQUA"
  | "GREEN"
  | "BLUE"
  | "YELLOW"
  | "PURPLE"
  | "LUMINOUS_VIVID_PINK"
  | "GOLD"
  | "ORANGE"
  | "RED"
  | "GREY"
  | "DARKER_GREY"
  | "NAVY"
  | "DARK_AQUA"
  | "DARK_GREEN"
  | "DARK_BLUE"
  | "DARK_PURPLE"
  | "DARK_VIVID_PINK"
  | "DARK_GOLD"
  | "DARK_ORANGE"
  | "DARK_RED"
  | "DARK_GREY"
  | "LIGHT_GREY"
  | "DARK_NAVY"
  | "BLURPLE"
  | "GREYPLE"
  | "DARK_BUT_NOT_BLACK"
  | "NOT_QUITE_BLACK"
  | "RANDOM"
  | [number, number, number]
  | number
  | string;

export type Constructable<T> = new (...args: any[]) => T;

export interface ShardingManagerOptions {
  totalShards?: number | "auto";
  shardList?: number[] | "auto";
  mode?: ShardingManagerMode;
  respawn?: boolean;
  shardArgs?: string[];
  token?: string;
  execArgv?: string[];
}

export type ShardingManagerMode = "process" | "worker";
export type ChannelResolvable = Channel | Snowflake;
export interface ImageFormatOptions {
  format?: string;
  size?: number;
}
export type GuildChannelResolvable = Snowflake | GuildChannel;
export type EmojiIdentifierResolvable = string | EmojiResolvable;
export type EmojiResolvable = Snowflake | GuildEmoji | ReactionEmoji;
export type RoleResolvable = Role | string;
export type GuildMemberResolvable = GuildMember | UserResolvable;  
export type GuildResolvable = Guild | GuildChannel | GuildMember | GuildEmoji | Invite | Role | Snowflake;
export type UserResolvable = User | Snowflake | Message | GuildMember;
export type VerificationLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type VoiceStatus = number;