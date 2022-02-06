import { Collection } from "discord.js";
import commands from "../lib/commands.js";
import dotenv from "dotenv";

dotenv.config();
/** @param {import("discord.js").Client} client */
export default async (client) => {
	if (!client.application)
		throw new Error("`ready` was fired but `client.application` is undefined???");
	console.log(
		`Connected to Discord with ID ${client.application.id} and tag ${client.user?.tag}`,
	);

	client.user?.setActivity(
		process.env.NODE_ENV === "production" ? "the SA server!" : "for bugs...",
		{ type: "WATCHING" },
	);
	const prexistingCommands = await client.application.commands.fetch({
		guildId: process.env.GUILD_ID || "",
	});
	/**
	 * @type {Collection<
	 * 	string,
	 * 	| import("@discordjs/builders").SlashCommandSubcommandsOnlyBuilder
	 * 	| Omit<
	 * 			import("@discordjs/builders").SlashCommandBuilder,
	 * 			"addSubcommand" | "addSubcommandGroup"
	 * 	  >
	 * >}
	 */
	const slashes = new Collection();
	commands.forEach((command, key) => slashes.set(key, command.data));
	prexistingCommands.each((command) => {
		if (slashes.has(command.name)) return;
		command.delete();
	});

	slashes.each((command, name) => {
		if (prexistingCommands.has(name)) {
			client.application?.commands.edit(name, command.toJSON(), process.env.GUILD_ID || "");
		} else {
			client.application?.commands.create(command.toJSON(), process.env.GUILD_ID || "");
		}
	});
};
