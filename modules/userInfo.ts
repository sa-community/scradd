import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	GuildMember,
	time,
	TimestampStyles,
} from "discord.js";

import config from "../common/config.js";
import constants from "../common/constants.js";
import defineCommand from "../lib/commands.js";
import { REACTIONS_NAME } from "./board/misc.js";

defineCommand(
	{
		name: "user-info",
		description: "View information about a user",

		options: {
			user: {
				type: ApplicationCommandOptionType.User,
				description: "The user to view (defaults to you)",
			},
		},
	},

	async (interaction) => {
		const user = await (interaction.options.getUser("user") ?? interaction.user).fetch();
		const rawMember =
			interaction.options.getMember("user") ??
			(user.id === interaction.user.id ? interaction.member : undefined);
		const member = rawMember instanceof GuildMember ? rawMember : undefined;
		const isMod =
			config.roles.mod &&
			(interaction.member instanceof GuildMember
				? interaction.member.roles.resolve(config.roles.mod.id)
				: interaction.member.roles.includes(config.roles.mod.id));

		const fields = [
			{ name: "ID", value: user.id, inline: true },
			{
				name: "Created Account",
				value: time(user.createdAt, TimestampStyles.RelativeTime),
				inline: true,
			},
			user.globalName
				? { name: "Display Name", value: user.globalName, inline: true }
				: { name: constants.zeroWidthSpace, value: constants.zeroWidthSpace, inline: true },
		];

		if (member)
			fields.push({
				name: "Roles",
				value:
					member?.roles
						.valueOf()
						.sorted((one, two) => two.comparePositionTo(one))
						.filter((role) => role.id !== config.guild.id)
						.toJSON()
						.join(" ") || "*No roles*",
				inline: false,
			});

		if (member?.joinedAt)
			fields.push({
				name: "Joined Server",
				value: time(member.joinedAt, TimestampStyles.RelativeTime),
				inline: true,
			});
		if (member?.nickname)
			fields.push({ name: "Nickname", value: member.nickname, inline: true });
		if (member?.voice.channel)
			fields.push({
				name: "Voice Channel",
				value:
					member.voice.channel?.toString() +
					`${member.voice.mute ? constants.emojis.discord.muted + " " : ""}${
						member.voice.deaf ? constants.emojis.discord.deafened + " " : ""
					}${
						member.voice.streaming || member.voice.selfVideo
							? constants.emojis.discord.streaming
							: ""
					}`.trim(),
				inline: true,
			});

		const banned = await config.guild.bans.fetch(user.id).catch(() => {});
		if (banned)
			fields.push(
				isMod
					? {
							name: "Ban Reason",
							value: banned.reason ?? "No reason provided",
							inline: true,
					  }
					: { name: "Banned", value: "Yes", inline: true },
			);

		await interaction.reply({
			embeds: [
				{
					color: member?.displayColor,
					// image: user.bannerURL() ?? user.accentColor,
					thumbnail: { url: (member ?? user).displayAvatarURL() },
					fields,
					author: {
						name: user.tag + (user.bot ? " 🤖" : ""),
						url:
							member &&
							`https://discordlookup.com/permissions-calculator/${
								(interaction.channel
									? member.permissionsIn(interaction.channel)
									: member.permissions
								).bitfield
							}`,
						icon_url: member?.avatar ? user.displayAvatarURL() : undefined,
					},
				},
			],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: `${user.id}_xp`,
							style: ButtonStyle.Secondary,
							type: ComponentType.Button,
							label: "View XP",
						},
						{
							customId: `${user.id}_exploreBoard`,
							style: ButtonStyle.Secondary,
							type: ComponentType.Button,
							label: `Explore ${REACTIONS_NAME}`,
						},
						...(user.id == interaction.user.id || isMod
							? [
									{
										customId: `${user.id}_viewStrikes`,
										style: ButtonStyle.Secondary,
										type: ComponentType.Button,
										label: "List Strikes",
									} as const,
							  ]
							: []),
						...(member &&
						isMod &&
						config.channels.tickets?.permissionsFor(member)?.has("ViewChannel")
							? [
									{
										customId: `${user.id}_contactUser`,
										style: ButtonStyle.Secondary,
										type: ComponentType.Button,
										label: "Contact User",
									} as const,
							  ]
							: []),
					],
				},
			],
		});
	},
);
