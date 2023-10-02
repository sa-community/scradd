import {
	ChannelType,
	ForumChannel,
	TextChannel,
	type NonThreadGuildBasedChannel,
	NewsChannel,
	MediaChannel,
} from "discord.js";
import { client } from "strife.js";

const guild = await client.guilds.fetch(process.env.GUILD_ID);
if (!guild.available) throw new ReferenceError("Guild is unavailable!");

async function getConfig() {
	const channels = await guild.channels.fetch();
	const roles = await guild.roles.fetch();

	const mod = roles.find((role) => role.editable && role.name.toLowerCase().includes("mod"));
	return {
		guild,

		channels: {
			info: getChannel("Info", ChannelType.GuildCategory, "start"),
			announcements:
				guild.systemChannel || getChannel("server", ChannelType.GuildText, "start"),
			tickets: getChannel("contact", ChannelType.GuildText, "start"),
			board: getChannel(
				"board",
				[ChannelType.GuildText, ChannelType.GuildAnnouncement],
				"end",
			),
			welcome: getChannel("welcome", ChannelType.GuildText),

			mod: getChannel("mod-talk", ChannelType.GuildText),
			modlogs: guild.publicUpdatesChannel || getChannel("logs", ChannelType.GuildText, "end"),
			exec: getChannel("exec", ChannelType.GuildText, "start"),
			admin: getChannel("admin", ChannelType.GuildText, "start"),

			general: getChannel("general", ChannelType.GuildText),

			support: "826250884279173162",
			server: "1138116320249000077",
			updates: getChannel("updates", ChannelType.GuildText, "partial"),
			suggestions: getChannel("suggestions", ChannelType.GuildForum),
			bugs: getChannel("bug", ChannelType.GuildForum, "start"),

			bots: getChannel("bots", ChannelType.GuildText, "partial"),

			advertise:
				getChannel("advertise", ChannelType.GuildText, "partial") ||
				getChannel("promo", ChannelType.GuildText, "partial"),

			old_suggestions: getChannel("suggestions", ChannelType.GuildText, "partial"),
		},

		roles: {
			mod,
			exec: roles.find((role) => role.name.toLowerCase().includes("exec")),
			staff: roles.find((role) => role.name.toLowerCase().includes("staff")) || mod,
			weekly_winner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
			dev: roles.find((role) => role.name.toLowerCase().startsWith("contributor")),
			epic: roles.find((role) => role.name.toLowerCase().includes("epic")),
			booster: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("booster"),
			),
			active: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("active"),
			),
		},
	};

	function getChannel<T extends ChannelType>(
		name: string,
		type: T | T[] = [],
		matchType: "end" | "full" | "partial" | "start" = "full",
	): Extract<NonThreadGuildBasedChannel, { type: T }> | undefined {
		const types = new Set<ChannelType>([type].flat());
		return channels.find(
			(channel): channel is Extract<NonThreadGuildBasedChannel, { type: T }> =>
				!!channel &&
				types.has(channel.type) &&
				{
					end: channel.name.endsWith(name),
					full: channel.name === name,
					partial: channel.name.includes(name),
					start: channel.name.startsWith(name),
				}[matchType],
		);
	}
}

const config = await getConfig();
export async function syncConfig() {
	const newConfig = await getConfig();
	config.roles = newConfig.roles;
	config.channels = newConfig.channels;
}
export default config;

const threads = await config.guild.channels.fetchActiveThreads();
export function getInitialChannelThreads(
	channel: ForumChannel | MediaChannel | TextChannel | NewsChannel,
) {
	return threads.threads.filter(({ parent }) => parent?.id === channel.id);
}
