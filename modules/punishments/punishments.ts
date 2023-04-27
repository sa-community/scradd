import {
	GuildMember,
	User,
	escapeMarkdown,
	time,
	TimestampStyles,
	ComponentType,
	ButtonStyle,
	type InteractionReplyOptions,
	type Snowflake,
	MessageType,
} from "discord.js";

import client from "../../client.js";
import { getSettings } from "../settings.js";
import { GlobalUsersPattern } from "../../util/discord.js";
import { convertBase } from "../../util/numbers.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import Database from "../../common/database.js";
import log, { getLoggingThread } from "../modlogs/logging.js";
import giveXp, { DEFAULT_XP } from "../xp/xp2.js";

export const EXPIRY_LENGTH = 1814400000,
	STRIKES_PER_MUTE = 3,
	MUTE_LENGTHS = [8, 16, 36],
	PARTIAL_STRIKE_COUNT = 1 / (STRIKES_PER_MUTE + 1),
	DEFAULT_STRIKES = 1;

export const strikeDatabase = new Database<{
	/** The ID of the user who was warned. */
	user: Snowflake;
	/** The time when this strike was issued. */
	date: number;
	id: number | string;
	count: number;
	removed: boolean;
}>("strikes");
await strikeDatabase.init();

export default async function warn(
	user: import("discord.js").GuildMember | import("discord.js").User,
	reason: string,
	strikes: number = DEFAULT_STRIKES,
	contextOrModerator: string | import("discord.js").User = client.user,
) {
	const allUserStrikes = strikeDatabase.data.filter(
		(strike) =>
			strike.user === user.id && strike.date + EXPIRY_LENGTH > Date.now() && !strike.removed,
	);

	const oldStrikeCount = allUserStrikes.reduce(
		(accumulator, { count }) => count + accumulator,
		0,
	);
	const oldMuteCount = Math.trunc(oldStrikeCount / STRIKES_PER_MUTE);
	const oldMuteLength = MUTE_LENGTHS.reduce(
		(accumulator, length, index) => (index < oldMuteCount ? accumulator + length : accumulator),
		0,
	);

	strikes = Math.max(Math.round(strikes * 4) / 4, PARTIAL_STRIKE_COUNT);
	const totalVerbalStrikes = Math.floor((oldStrikeCount % 1) + (strikes % 1));
	const displayStrikes = Math.trunc(strikes) + totalVerbalStrikes;
	const moderator = contextOrModerator instanceof User ? contextOrModerator : client.user;
	const context =
		(contextOrModerator instanceof User
			? ""
			: contextOrModerator + (totalVerbalStrikes ? "\n\n" : "")) +
		(totalVerbalStrikes ? "Too many verbal strikes" : "");

	const logMessage = await log(
		`⚠️ ${user.toString()} ${
			displayStrikes
				? `gained ${displayStrikes} strike${displayStrikes === 1 ? "" : "s"} from`
				: "verbally warned by"
		} ${moderator.toString()}!`,
		"members",
		{
			files: [
				{
					attachment: Buffer.from(reason + (context && `\n>>> ${context}`), "utf8"),
					name: "strike.txt",
				},
			],
		},
	);
	giveXp(user, logMessage.url, DEFAULT_XP * strikes * -1);

	const member =
		user instanceof GuildMember
			? user
			: await CONSTANTS.guild.members.fetch(user.id).catch(() => {});

	const id = convertBase(logMessage.id, 10, convertBase.MAX_BASE);

	await user
		.send({
			embeds: [
				{
					title: `You were ${
						displayStrikes
							? `warned${displayStrikes > 1 ? ` ${displayStrikes} times` : ""}`
							: "verbally warned"
					} in ${escapeMarkdown(CONSTANTS.guild.name)}!`,

					description: reason + (context && `\n>>> ${context}`),
					color: member?.displayColor,

					footer: {
						icon_url: CONSTANTS.guild.iconURL() ?? undefined,

						text: `Strike ${id}${
							displayStrikes
								? `${CONSTANTS.footerSeperator}Expiring in 21 ${
										process.env.NODE_ENV === "production" ? "day" : "minute"
								  }s`
								: ""
						}`,
					},
				},
			],
			components: CONSTANTS.channels.contact?.permissionsFor(user)?.has("ViewChannel")
				? [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									style: ButtonStyle.Primary,
									label: "Appeal Strike",
									custom_id: `${id}_appealStrike`,
								},
							],
						},
				  ]
				: [],
		})
		.catch(() => {});

	strikeDatabase.data = [
		...strikeDatabase.data,
		{ user: user.id, id, date: Date.now(), count: strikes, removed: false },
	];

	const totalStrikeCount = oldStrikeCount + strikes;

	if (Math.trunc(totalStrikeCount) > MUTE_LENGTHS.length * STRIKES_PER_MUTE + 1) {
		await (member?.bannable &&
		!member.roles.premiumSubscriberRole &&
		(process.env.NODE_ENV === "production" || member.roles.highest.name === "@everyone")
			? member.ban({ reason: "Too many strikes" })
			: log(`⚠️ Missing permissions to ban ${user.toString()}.`));
		return;
	}

	const totalMuteCount = Math.trunc(totalStrikeCount / STRIKES_PER_MUTE);
	const totalMuteLength = MUTE_LENGTHS.reduce(
		(accumulator, length, index) =>
			index < totalMuteCount ? accumulator + length : accumulator,
		0,
	);
	const addedMuteLength = totalMuteLength - oldMuteLength;

	if (addedMuteLength) {
		await (member?.moderatable
			? member.disableCommunicationUntil(
					addedMuteLength * (process.env.NODE_ENV === "production" ? 3_600_000 : 60_000) +
						Date.now(),
					"Too many strikes",
			  )
			: log(
					`⚠️ Missing permissions to mute ${user.toString()} for ${addedMuteLength} ${
						process.env.NODE_ENV === "production" ? "hour" : "minute"
					}${addedMuteLength === 1 ? "" : "s"}.`,
			  ));
	}

	if (Math.trunc(totalStrikeCount) > MUTE_LENGTHS.length * STRIKES_PER_MUTE) {
		await user.send(
			`__**This is your last chance. If you get another strike before ${time(
				new Date((allUserStrikes[0]?.date ?? Date.now()) + EXPIRY_LENGTH),
				TimestampStyles.LongDate,
			)}, you will be banned.**__`,
		);
	}
}
const databases = await (await getLoggingThread("databases")).messages.fetch({ limit: 100 });
const { url } =
	databases
		.find((message) => message.attachments.first()?.name === "robotop_warns.json")
		?.attachments.first() ?? {};
export const robotopStrikes = url
	? await fetch(url).then(
			async (response) =>
				await response.json<{ id: number; mod: Snowflake; reason: string }[]>(),
	  )
	: [];

export async function filterToStrike(filter: string) {
	if (/^\d{1,4}$/.test(filter)) {
		const strike = strikeDatabase.data.find((strike) => String(strike.id) === filter);
		const info = robotopStrikes.find((strike) => String(strike.id) === filter);
		if (strike && info) return { ...info, ...strike, id: String(info.id) };
	}
	const channel = await getLoggingThread(filter.startsWith("0") ? undefined : "members");
	const messageId = convertBase(filter, convertBase.MAX_BASE, 10);

	const messageFromId = await channel?.messages.fetch(messageId).catch(() => {});
	const message = messageFromId || (await channel?.messages.fetch(filter).catch(() => {}));
	if (!message) return;

	const strikeId = messageFromId ? filter : convertBase(filter, 10, convertBase.MAX_BASE);
	const strike = strikeDatabase.data.find((strike) => String(strike.id) === strikeId);
	if (!strike) return;

	if (
		strikeId.startsWith("0") &&
		message.type === MessageType.AutoModerationAction &&
		message.embeds[0]
	) {
		return {
			...strike,
			mod: "643945264868098049",

			reason: `${
				message.embeds[0].fields.find((field) => field.name === "rule_name")?.value
			}\n>>> ${message.embeds[0].description}`,
		};
	}

	const { url } = message.attachments.first() || {};
	return {
		...strike,
		mod: [...message.content.matchAll(GlobalUsersPattern)]?.[1]?.groups?.id,

		reason: url
			? await fetch(url).then(async (response) => await response.text())
			: message.content,
	};
}

/**
 * Reply to a interaction with strike information.
 *
 * @param interactor - The user who initiated the interaction.
 * @param filter - The strike to get.
 */
export async function getStrikeById(
	interactor: GuildMember,
	filter: string,
): Promise<InteractionReplyOptions> {
	const strike = await filterToStrike(filter);
	if (!strike)
		return { ephemeral: true, content: `${CONSTANTS.emojis.statuses.no} Invalid strike ID!` };

	const isModerator = CONSTANTS.roles.mod && interactor.roles.resolve(CONSTANTS.roles.mod.id);
	if (strike.user !== interactor.id && !isModerator) {
		return {
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to view this member’s strikes!`,
		};
	}

	const member = await CONSTANTS.guild.members.fetch(strike.user).catch(() => {});
	const user = member?.user || (await client.users.fetch(strike.user).catch(() => {}));

	const moderator =
		isModerator && strike.mod && (await client.users.fetch(strike.mod).catch(() => {}));
	const nick = member?.displayName ?? user?.username;
	const { useMentions } = getSettings(interactor.user);
	return {
		components: isModerator
			? [
					{
						type: ComponentType.ActionRow,

						components: [
							strike.removed
								? {
										type: ComponentType.Button,
										customId: `${strike.id}_addStrikeBack`,
										label: "Add back",
										style: ButtonStyle.Primary,
								  }
								: {
										type: ComponentType.Button,
										customId: `${strike.id}_removeStrike`,
										label: "Remove",
										style: ButtonStyle.Danger,
								  },
						],
					},
			  ]
			: [],

		ephemeral: true,

		embeds: [
			{
				color: member?.displayColor,

				author: nick
					? { icon_url: (member || user)?.displayAvatarURL(), name: nick }
					: undefined,

				title: `${strike.removed ? "~~" : ""}Strike \`${strike.id}\`${
					strike.removed ? "~~" : ""
				}`,

				description: strike.reason,
				timestamp: new Date(strike.date).toISOString(),

				fields: [
					{ name: "⚠️ Count", value: String(strike.count), inline: true },
					...(moderator
						? [
								{
									name: "🛡 Moderator",
									value: useMentions ? moderator.toString() : moderator.username,
									inline: true,
								},
						  ]
						: []),
					...(user
						? [
								{
									name: "👤 Target user",
									value: useMentions ? user.toString() : user.username,
									inline: true,
								},
						  ]
						: []),
				],
			},
		],
	};
}

TODO;
