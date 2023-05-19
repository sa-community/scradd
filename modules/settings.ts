import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	type InteractionReplyOptions,
	type Snowflake,
	User,
} from "discord.js";

import config from "../common/config.js";
import constants from "../common/constants.js";
import Database from "../common/database.js";
import defineCommand from "../lib/commands.js";
import { weeklyXpDatabase } from "./xp/misc.js";
import { defineButton } from "../lib/components.js";

export const userSettingsDatabase = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** Whether to ping the user when their message gets on the board. */
	boardPings?: boolean;
	/** Whether to ping the user when they level up. */
	levelUpPings?: boolean;
	/** Whether to ping the user when they are a top poster of the week. */
	weeklyPings?: boolean;
	/** Whether to automatically react to their messages with random emojis. */
	autoreactions?: boolean;
	useMentions?: boolean;
	dmReminders?: boolean;
	resourcesDmed?: true;
}>("user_settings");
await userSettingsDatabase.init();

defineCommand(
	{
		name: "settings",
		description: "Customize personal settings",

		options: {
			"board-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Enable pings when your messages get on #${config.channels.board?.name}`,
			},

			"level-up-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Enable pings you when you level up",
			},

			"weekly-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Enable pings if you are one of the most active people each week (#${config.channels.announcements?.name})`,
			},

			"autoreactions": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Enable automatic funny emoji reactions to your messages",
			},

			"use-mentions": {
				type: ApplicationCommandOptionType.Boolean,

				description:
					"Enable using pings instead of usernames so you can view profiles (may not work due to Discord bugs)",
			},
			"dm-reminders": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Send reminders in your DMs by default",
			},
		},
	},

	async (interaction) => {
		await interaction.reply(
			updateSettings(interaction.user, {
				autoreactions: interaction.options.getBoolean("autoreactions") ?? undefined,
				boardPings: interaction.options.getBoolean("board-pings") ?? undefined,
				levelUpPings: interaction.options.getBoolean("level-up-pings") ?? undefined,
				useMentions: interaction.options.getBoolean("use-mentions") ?? undefined,
				weeklyPings: interaction.options.getBoolean("weekly-pings") ?? undefined,
				dmReminders: interaction.options.getBoolean("dm-reminders") ?? undefined,
			}),
		);
	},
);

defineButton("toggleSetting", async (interaction, setting = "") => {
	if (
		(!interaction.message.interaction ||
			interaction.message.interaction.user.id === interaction.user.id) &&
		(!interaction.message.mentions.parsedUsers.size ||
			interaction.message.mentions.users.has(interaction.user.id))
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to update other people’s settings!`,
		});
	}
	await interaction.reply(updateSettings(interaction.user, { [setting]: "toggle" }));
});

export function updateSettings(
	user: User,
	settings: {
		autoreactions?: boolean | "toggle";
		boardPings?: boolean | "toggle";
		levelUpPings?: boolean | "toggle";
		useMentions?: boolean | "toggle";
		weeklyPings?: boolean | "toggle";
		dmReminders?: boolean | "toggle";
		resourcesDmed?: true;
	},
) {
	const settingsForUser = getSettings(user, false);
	const defaultSettings = getDefaultSettings(user);

	const old = {
		autoreactions: settingsForUser?.autoreactions ?? defaultSettings.autoreactions,
		boardPings: settingsForUser?.boardPings ?? defaultSettings.boardPings,
		levelUpPings: settingsForUser?.levelUpPings ?? defaultSettings.levelUpPings,
		useMentions: settingsForUser?.useMentions ?? defaultSettings.useMentions,
		weeklyPings: settingsForUser?.weeklyPings ?? defaultSettings.weeklyPings,
		dmReminders: settingsForUser?.dmReminders ?? defaultSettings.dmReminders,
		resourcesDmed: defaultSettings.resourcesDmed,
	};

	const updated = {
		user: user.id,
		boardPings:
			settings.boardPings === "toggle"
				? !old.boardPings
				: settings.boardPings ?? settingsForUser?.boardPings,
		levelUpPings:
			settings.levelUpPings === "toggle"
				? !old.levelUpPings
				: settings.levelUpPings ?? settingsForUser?.levelUpPings,
		weeklyPings:
			settings.weeklyPings === "toggle"
				? !old.weeklyPings
				: settings.weeklyPings ?? settingsForUser?.weeklyPings,
		autoreactions:
			settings.autoreactions === "toggle"
				? !old.autoreactions
				: settings.autoreactions ?? settingsForUser?.autoreactions,
		useMentions:
			settings.useMentions === "toggle"
				? !old.useMentions
				: settings.useMentions ?? settingsForUser?.useMentions,

		dmReminders:
			settings.dmReminders === "toggle"
				? !old.dmReminders
				: settings.dmReminders ?? settingsForUser?.dmReminders,

		resourcesDmed: settings.resourcesDmed,
	};

	userSettingsDatabase.data = settingsForUser
		? userSettingsDatabase.data.map((data) => (data.user === user.id ? updated : data))
		: [...userSettingsDatabase.data, updated];

	return {
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Updated your settings!`,

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "boardPings_toggleSetting",
						type: ComponentType.Button,
						label: "Board Pings",
						style: ButtonStyle[updated.boardPings ? "Success" : "Danger"],
					},
					{
						customId: "levelUpPings_toggleSetting",
						type: ComponentType.Button,
						label: "Level Up Pings",
						style: ButtonStyle[updated.levelUpPings ? "Success" : "Danger"],
					},
					{
						customId: "weeklyPings_toggleSetting",
						type: ComponentType.Button,
						label: `Weekly Winners Pings`,
						style: ButtonStyle[updated.weeklyPings ? "Success" : "Danger"],
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "autoreactions_toggleSetting",
						type: ComponentType.Button,
						label: "Autoreactions",
						style: ButtonStyle[updated.autoreactions ? "Success" : "Danger"],
					},
					{
						customId: "useMentions_toggleSetting",
						type: ComponentType.Button,
						label: "Use Mentions",
						style: ButtonStyle[updated.useMentions ? "Success" : "Danger"],
					},
					{
						customId: "dmReminders_toggleSetting",
						type: ComponentType.Button,
						label: "DM Reminders",
						style: ButtonStyle[updated.dmReminders ? "Success" : "Danger"],
					},
				],
			},
		],
	} satisfies InteractionReplyOptions;
}

export function getSettings(
	user: { id: Snowflake },
	defaults?: true,
): {
	boardPings: boolean;
	levelUpPings: boolean;
	weeklyPings: boolean;
	autoreactions: boolean;
	useMentions: boolean;
	dmReminders: boolean;
	resourcesDmed: boolean;
};
export function getSettings(
	user: { id: Snowflake },
	defaults: false,
): {
	boardPings?: boolean;
	levelUpPings?: boolean;
	weeklyPings?: boolean;
	autoreactions?: boolean;
	useMentions?: boolean;
	dmReminders?: boolean;
	resourcesDmed?: true;
};
export function getSettings(user: { id: Snowflake }, defaults: boolean = true) {
	const settings: {
		boardPings?: boolean;
		levelUpPings?: boolean;
		weeklyPings?: boolean;
		autoreactions?: boolean;
		useMentions?: boolean;
		dmReminders?: boolean;
		resourcesDmed?: boolean;
	} = userSettingsDatabase.data.find((settings) => settings.user === user.id) ?? {};
	if (defaults) {
		const defaultSettings = getDefaultSettings(user);
		for (const setting of Object.keys(defaultSettings)) {
			if (!Object.prototype.hasOwnProperty.call(defaultSettings, setting)) return;
			if (settings[setting] === undefined) settings[setting] = defaultSettings[setting];
		}
	}
	return settings;
}

export function getDefaultSettings(user: { id: Snowflake }) {
	return {
		autoreactions: true,
		dmReminders: true,
		boardPings: process.env.NODE_ENV === "production",
		levelUpPings: process.env.NODE_ENV === "production",
		useMentions:
			(weeklyXpDatabase.data.findIndex((gain) => user.id === gain.user) + 1 || 30) < 30,
		weeklyPings: process.env.NODE_ENV === "production",
		resourcesDmed: false,
	};
}
