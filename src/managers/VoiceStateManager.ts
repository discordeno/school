import BaseManager from "./BaseManager.ts";

export class VoiceStateManager extends BaseManager<Snowflake, VoiceState, typeof VoiceState> {
  guild: Guild;

  constructor(guild: Guild, iterable?: Iterable<VoiceState>) {
    super(guild.client, iterable, { name: "VoiceState" });

    this.guild = guild;
  }

  add(data, cache = true) {
    const existing = this.cache.get(data.user_id);
    if (existing) return existing._patch(data);

    const entry = new this.holds(this.guild, data);
    if (cache) this.cache.set(data.user_id, entry);
    return entry;
  }
}

export default VoiceStateManager;
