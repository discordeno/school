import BaseManager from "./BaseManager.ts";
import { DJSError } from "../errors/mod.ts";
import ApplicationCommand from "../structures/ApplicationCommand.ts";
import Collection from "../util/Collection.ts";
import Client from "../client/Client.ts";
import { Snowflake } from "../../typings/mod.ts";

export class ApplicationCommandManager extends BaseManager {
  constructor(client: Client, iterable: unknown) {
    super(client, iterable, ApplicationCommand);
  }

  /**
   * The cache of this manager
   * @type {Collection<Snowflake, ApplicationCommand>}
   * @name ApplicationCommandManager#cache
   */

  add(data, cache) {
    return super.add(data, cache, { extras: [this.guild] });
  }

  get commandPath() {
    let path = this.client.api.applications(this.client.application.id);
    if (this.guild) path = path.guilds(this.guild.id);
    return path.commands;
  }

  async fetch(id: Snowflake, cache = true, force = false) {
    if (id) {
      if (!force) {
        const existing = this.cache.get(id);
        if (existing) return existing;
      }
      const command = await this.commandPath(id).get();
      return this.add(command, cache);
    }

    const data = await this.commandPath.get();
    return data.reduce((coll, command) => coll.set(command.id, this.add(command, cache)), new Collection());
  }

  async create(command: ApplicationCommandData): Promise<ApplicationCommand> {
    const data = await this.commandPath.post({
      data: this.constructor.transformCommand(command),
    });
    return this.add(data);
  }

  async set(commands: ApplicationCommandData[]): Promise<Collection<Snowflake, ApplicationCommand>> {
    const data = await this.commandPath.put({
      data: commands.map((c) => this.constructor.transformCommand(c)),
    });
    return data.reduce((coll, command) => coll.set(command.id, this.add(command)), new Collection());
  }

  async edit(command: ApplicationCommandData, data: ApplicationCommandData): Promise<ApplicationCommand> {
    const id = this.resolveID(command);
    if (!id) throw new DJSError.TypeError("INVALID_TYPE", "command", "ApplicationCommandResolvable");

    const patched = await this.commandPath(id).patch({ data: this.constructor.transformCommand(data) });
    return this.add(patched);
  }

  /**
   * Deletes an application command.
   * @param {ApplicationCommandResolvable} command The command to delete
   * @returns {Promise<?ApplicationCommand>}
   * @example
   * // Delete a command
   * guild.commands.delete('123456789012345678')
   *   .then(console.log)
   *   .catch(console.error);
   */
  async delete(command: ApplicationCommandResolvable): Promise<ApplicationCommand | null> {
    const id = this.resolveID(command);
    if (!id) throw new DJSError.TypeError("INVALID_TYPE", "command", "ApplicationCommandResolvable");

    await this.commandPath(id).delete();

    const cached = this.cache.get(id);
    this.cache.delete(id);
    return cached ?? null;
  }

  static transformCommand(command: ApplicationCommandData) {
    return {
      name: command.name,
      description: command.description,
      options: command.options?.map((o) => ApplicationCommand.transformOption(o)),
      default_permission: command.defaultPermission,
    };
  }
}

export default ApplicationCommandManager;
