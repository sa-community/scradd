import { ChannelType } from "discord.js";

import client from "../client.js";

const guild = await client.guilds.fetch(process.env.GUILD_ID ?? "");

const saRepo = "ScratchAddons/ScratchAddons";
async function getConstants() {
	const channels = await guild.channels.fetch();
	const roles = await guild.roles.fetch();

	const latestRelease: string =
		process.env.NODE_ENV == "production"
			? (
					await fetch(`https://api.github.com/repos/${saRepo}/releases/latest`).then(
						async (res) => await res.json<any>(),
					)
			  ).tag_name
			: "master";

	return {
		collectorTime: 45_000,
		zeroWidthSpace: "\u200b",

		emojis: {
			statuses: { yes: "<:yes:1016127835217334322>", no: "<:no:1016127863273037935>" },

			discord: {
				reply: "<:reply:953046345214750720>",
				error: "<:error:949439327413358602>",
				add: "<:add:938441019278635038>",
				remove: "<:remove:947707131879104554>",
				edit: "<:edit:938441054716297277>",
				pin: "<:pin:938441100258070568>",
				boost: "<:boost:938441038756986931>",
				thread: "<:thread:938441090657296444>",
				typing: "<a:typing:949436374174560276>",
				call: "<:call:950438678361161738>",
				yes: "<:yes:1048464639056420885>",
				no: "<:no:1048464674892558396>",
				warning: "<:warning:1048466347039928370>",
				muted: "<:muted:1082818151303106621>",
				deafened: "<:deafened:1082818124463743027>",
				streaming: "<:streaming:1082818172555645028>",
				stage: "<:stage:1083046440714129481>",
				speaker: "<:speaker:1083046535320829952>",
				stageLive: "<:stage_live:1083046549656977423>",
				raisedHand: "<:raised_hand:1083046563049381898>",
			},

			misc: {
				addon: "<:addon:1008842100764332142>",
				join: "<:join:1041863919708418068>",
				leave: "<:leave:1041863867757756477>",
				ban: "<:ban:1041864907194388480>",
			},
		},

		testingServer: await client.guilds.fetch("938438560925761619").catch(() => {}),

		roles: {
			designers: "966174686142672917",
			developers: "938439909742616616",
			testers: "938440159102386276",
			admin: roles.find((role) => role.name.toLowerCase().includes("admin")),
			mod: roles.find((role) => role.name.toLowerCase().includes("mod")),
			weekly_winner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
			epic: roles.find((role) => role.name.toLowerCase().includes("epic")),
			booster: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("booster"),
			),
			active: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("active"),
			),
		},

		urls: {
			usercountJson: "https://scratchaddons.com/usercount.json",
			saSource: `https://raw.githubusercontent.com/ScratchAddons/ScratchAddons/${latestRelease}`,
			saRepo,
			latestRelease,
			addonImageRoot: "https://scratchaddons.com/assets/img/addons",
			settingsPage: "https://scratch.mit.edu/scratch-addons-extension/settings",
		},

		themeColor: process.env.NODE_ENV === "production" ? 0xff_7b_26 : 0x17_5e_f8,
		footerSeperator: " • ",
		webhookName: "scradd-webhook",

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

			updates: getChannel("updates", ChannelType.GuildText, "partial"),
			suggestions: getChannel("suggestions", ChannelType.GuildForum),
			bugs: getChannel("bug", ChannelType.GuildForum, "start"),

			bots: getChannel("bots", ChannelType.GuildText, "partial"),

			advertise:
				getChannel("advertise", ChannelType.GuildText, "partial") ||
				getChannel("promo", ChannelType.GuildText, "partial"),

			old_suggestions: getChannel("suggestions", ChannelType.GuildText, "partial"),
		},

		guild,
	};

	function getChannel<T extends ChannelType>(
		name: string,
		type: T | T[] = [],
		matchType: "end" | "full" | "partial" | "start" = "full",
	): (import("discord.js").NonThreadGuildBasedChannel & { type: T }) | undefined {
		const types = [type].flat() as ChannelType[];
		return channels.find((channel): channel is typeof channel & { type: T } => {
			if (!channel || !types.includes(channel.type)) return false;

			switch (matchType) {
				case "full":
					return channel.name === name;
				case "partial":
					return channel.name.includes(name);
				case "start":
					return channel.name.startsWith(name);
				case "end":
					return channel.name.endsWith(name);
			}
		});
	}
}

const CONSTANTS = await getConstants();
export async function syncConstants() {
	const newConstants = await getConstants();
	CONSTANTS.roles = newConstants.roles;
	CONSTANTS.urls = newConstants.urls;
	CONSTANTS.channels = newConstants.channels;
}
export default CONSTANTS;
