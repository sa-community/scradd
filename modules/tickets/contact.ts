import {
	type AnySelectMenuInteraction,
	type APIEmbedField,
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	InteractionResponse,
	InteractionType,
	ModalSubmitInteraction,
	time,
	TimestampStyles,
	type PrivateThreadChannel,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import log, { LoggingEmojis } from "../logging/misc.js";
import { PARTIAL_STRIKE_COUNT, strikeDatabase } from "../punishments/misc.js";
import {
	type Category,
	SA_CATEGORY,
	SERVER_CATEGORY,
	TICKET_CATEGORIES,
	TICKETS_BY_MEMBER,
	allFields,
	categoryToDescription,
	MOD_CATEGORY,
} from "./misc.js";

export async function showTicketModal(
	interaction: AnySelectMenuInteraction,
): Promise<InteractionResponse | undefined>;
export async function showTicketModal(
	interaction: ButtonInteraction,
	category: Exclude<Category, "appeal">,
): Promise<InteractionResponse | undefined>;
export async function showTicketModal(
	interaction: ButtonInteraction,
	category: "appeal",
	strikeId: string,
): Promise<InteractionResponse | undefined>;
export async function showTicketModal(
	interaction: AnySelectMenuInteraction | ButtonInteraction,
	category?: Category,
	strikeId?: string,
) {
	const option = interaction.isAnySelectMenu() ? interaction.values[0] : category;

	if (option === SA_CATEGORY) {
		return await interaction.reply({
			content: `${
				constants.emojis.statuses.no
			} Please don’t contact mods for SA help. Instead, put your suggestions in ${config.channels.suggestions?.toString()}, bug reports in ${config.channels.bugs?.toString()}, and other questions, comments, concerns, or etcetera in <#${
				config.channels.support
			}>.`,

			ephemeral: true,
		});
	}

	if (option === SERVER_CATEGORY) {
		return await interaction.reply({
			content: `${constants.emojis.statuses.no} Please don’t contact mods for server suggestions. Instead, share them in <#${config.channels.server}>.`,

			ephemeral: true,
		});
	}

	if (!TICKET_CATEGORIES.includes(option))
		throw new TypeError(`Unknown ticket category: ${option}`);

	const fields = allFields[option];

	await interaction.showModal({
		title: categoryToDescription[option],
		customId: `${option}_contactMods`,
		components: fields.map((field) => ({
			type: ComponentType.ActionRow,
			components: [field.customId === "strike" ? { ...field, value: strikeId } : field],
		})),
	});
}
export default async function contactMods(
	interaction:
		| ModalSubmitInteraction
		| ChatInputCommandInteraction<"cached" | "raw">
		| ButtonInteraction,
	options: Category | GuildMember,
) {
	const option = options instanceof GuildMember ? MOD_CATEGORY : options;

	const member =
		options instanceof GuildMember
			? options
			: interaction.member || (await config.guild.members.fetch(interaction.user.id));
	if (!(member instanceof GuildMember)) throw new TypeError("member is not a GuildMember!");

	if (!config.channels.tickets) throw new ReferenceError("Could not find tickets channel!");

	const fields =
		interaction.type === InteractionType.ModalSubmit
			? Object.entries(
					{
						appeal: { "Strike ID": "strike" },
						report: { "Reported User": "user" },
						role: { "Role(s)": "role", "Account(s)": "account" },
						bug: {},
						update: {},
						rules: { Rule: "rule" },
						server: {},
						other: {},
						[MOD_CATEGORY]: {},
					}[option],
			  ).map<APIEmbedField>(([name, key]) => ({
					name,
					value: interaction.fields.getTextInputValue(key),
					inline: true,
			  }))
			: [];
	const body =
		option !== "role" &&
		interaction.type === InteractionType.ModalSubmit &&
		interaction.fields.getTextInputValue("BODY");
	const details = {
		title: categoryToDescription[option],

		color: member.displayColor,

		author: { icon_url: member.displayAvatarURL(), name: member.displayName },
		...(body
			? fields.length
				? { fields: [...fields, { name: constants.zeroWidthSpace, value: body }] }
				: { description: body }
			: { fields }),
	};

	const oldThread = TICKETS_BY_MEMBER[member.id];
	if (oldThread) {
		await oldThread.send({ embeds: [details] });
		return oldThread;
	}

	const thread = (await config.channels.tickets.threads.create({
		name: `${member.user.displayName} (${member.id})`,
		reason: `${interaction.user.tag} contacted ${
			option === MOD_CATEGORY ? member.user.tag : "mods"
		}`,
		type: ChannelType.PrivateThread,
		invitable: false,
	})) as PrivateThreadChannel;
	TICKETS_BY_MEMBER[member.id] = thread;
	await log(
		`${LoggingEmojis.Thread} ${interaction.user.toString()} contacted ${
			option === MOD_CATEGORY ? member.toString() : "mods"
		}: ${thread.toString()}`,
	);

	const strikes = strikeDatabase.data
		.filter((strike) => strike.user === member.id)
		.sort((one, two) => two.date - one.date);

	const totalStrikeCount = Math.trunc(
		strikes.reduce(
			(accumulator, { count, removed }) => count * Number(!removed) + accumulator,
			0,
		),
	);

	const numberOfPages = Math.ceil(strikes.length / 15);

	const filtered = strikes.filter((_, index) => index < 15);

	await thread.send({
		components: filtered.length
			? [
					{
						type: ComponentType.ActionRow,

						components:
							filtered.length > 5
								? [
										{
											type: ComponentType.StringSelect,
											customId: "_selectStrike",
											placeholder: "View more information on a strike",

											options: filtered.map((strike) => ({
												label: strike.id.toString(),
												value: strike.id.toString(),
											})),
										},
								  ]
								: filtered.map((strike) => ({
										type: ComponentType.Button,
										customId: `${strike.id}_strike`,
										label: strike.id.toString(),
										style: ButtonStyle.Secondary,
								  })),
					},
			  ]
			: [],

		embeds: [
			details,
			{
				title: `${member.displayName}’s strikes`,
				description: filtered.length
					? filtered
							.map(
								(strike) =>
									`${strike.removed ? "~~" : ""}\`${strike.id}\`${
										strike.count === 1
											? ""
											: ` (${
													strike.count === PARTIAL_STRIKE_COUNT
														? "verbal"
														: `\\*${strike.count}`
											  })`
									} - ${time(
										new Date(strike.date),
										TimestampStyles.RelativeTime,
									)}${strike.removed ? "~~" : ""}`,
							)
							.join("\n")
					: `${constants.emojis.statuses.no} ${member.toString()} has never been warned!`,

				footer: filtered.length
					? {
							text: `Page 1/${numberOfPages}${
								constants.footerSeperator
							} ${totalStrikeCount} strike${totalStrikeCount === 1 ? "" : "s"}`,
					  }
					: undefined,

				author: { icon_url: member.displayAvatarURL(), name: member.displayName },
				color: member.displayColor,
			},
		],
		content:
			option === MOD_CATEGORY || process.env.NODE_ENV === "development"
				? ""
				: config.roles.mod?.toString(),
		allowedMentions: { parse: ["roles"] },
	});

	await thread.members.add(member, "Thread created");

	return thread;
}

export async function contactUser(
	member: GuildMember,
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
) {
	await interaction.deferReply({ ephemeral: true });
	const existingThread = TICKETS_BY_MEMBER[member.id];

	if (existingThread) {
		await interaction.editReply(
			`${
				constants.emojis.statuses.no
			} ${member.toString()} already has a ticket open! Talk to them in ${existingThread.toString()}.`,
		);

		return;
	}

	const message = await interaction.editReply({
		content: `Are you sure you want to contact **${member.toString()}**?`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Contact",
						style: ButtonStyle.Success,
						customId: `confirm-${interaction.id}`,
					},
				],
			},
		],
		allowedMentions: { users: [] },
	});

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,
		time: constants.collectorTime,
		max: 1,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			await buttonInteraction.deferReply({ ephemeral: true });
			const thread = await contactMods(interaction, member);
			await buttonInteraction.editReply(
				`${
					constants.emojis.statuses.yes
				} **Ticket opened!** Send ${member.toString()} a message in ${thread.toString()}.`,
			);
		})
		.on("end", async () => {
			await interaction.editReply({ components: disableComponents(message.components) });
		});
}
