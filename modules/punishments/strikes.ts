import {
	GuildMember,
	time,
	ApplicationCommandOptionType,
	TimestampStyles,
	ButtonStyle,
	ComponentType,
	ButtonInteraction,
	ChatInputCommandInteraction,
	User,
} from "discord.js";
import client from "../../client.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import { getStrikeById, strikeDatabase } from "./punishments.js";
import defineCommand from "../../commands.js";
import { paginate } from "../../util/discord.js";

defineCommand({
		description: "Commands to view strike information",

		subcommands: {
			id: {
				description: "View a strike by ID",

				options: {
					id: {
						required: true,
						type: ApplicationCommandOptionType.String,
						description: "The strike’s ID",
					},
				},
			},

			user: {
				description: "View your or (Mods only) someone else’s strikes",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "(Mods only) The user to see strikes for",
					},
				},
			},
		},

		censored: false,
	},

	async (interaction) => {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("interaction.member is not a GuildMember");
		switch (interaction.options.getSubcommand(true)) {
			case "user": {
				const selected = interaction.options.getUser("user") ?? interaction.member;
				await getStrikes(selected, interaction);
				break;
			}
			case "id": {
				await interaction.reply(
					await getStrikeById(
						interaction.member,
						interaction.options.getString("id", true),
					),
				);
			}
		}
	},

	buttons: {
		async strike(interaction, id) {
			if (!(interaction.member instanceof GuildMember))
				throw new TypeError("interaction.member is not a GuildMember");

			await interaction.reply(await getStrikeById(interaction.member, id ?? ""));
			return;
		},
		async viewStrikes(interaction, userId = "") {
			await getStrikes(await client.users.fetch(userId), interaction);
		},
	},

	stringSelects: {
		async selectStrike(interaction) {
			if (!(interaction.member instanceof GuildMember))
				throw new TypeError("interaction.member is not a GuildMember");

			const [id] = interaction.values;
			if (id) await interaction.reply(await getStrikeById(interaction.member, id));
		},
	},
});

async function getStrikes(
	selected: GuildMember | User,
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
) {
	if (
		selected.id !== interaction.user.id &&
		!(
			CONSTANTS.roles.mod &&
			(interaction.member instanceof GuildMember
				? interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
				: interaction.member?.roles.includes(CONSTANTS.roles.mod.id))
		)
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to view this member’s strikes!`,
		});
	}

	const user = selected instanceof GuildMember ? selected.user : selected;
	const member =
		selected instanceof GuildMember
			? selected
			: await CONSTANTS.guild.members.fetch(selected.id).catch(() => {});

	const strikes = strikeDatabase.data
		.filter((strike) => strike.user === selected.id)
		.sort((one, two) => two.date - one.date);

	const totalStrikeCount = Math.trunc(
		strikes.reduce(
			(accumulator, { count, removed }) => count * Number(!removed) + accumulator,
			0,
		),
	);

	await paginate(
		strikes,
		(strike) =>
			`${strike.removed ? "~~" : ""}\`${strike.id}\`${
				strike.count === 1
					? ""
					: ` (${strike.count === 0.25 ? "verbal" : `\\*${strike.count}`})`
			} - ${time(new Date(strike.date), TimestampStyles.RelativeTime)}${
				strike.removed ? "~~" : ""
			}`,
		async (data) => {
			const newData = { ...data };
			if (
				newData.embeds?.[0] &&
				"footer" in newData.embeds[0] &&
				newData.embeds[0].footer?.text
			) {
				newData.embeds[0].footer.text = newData.embeds[0].footer.text.replace(
					/\d+ $/,
					`${totalStrikeCount} strike${totalStrikeCount === 1 ? "" : "s"}`,
				);
			}
			return await (interaction.replied
				? interaction.editReply(newData)
				: interaction.reply(newData));
		},
		{
			title: `${member?.displayName ?? user.username}’s strikes`,
			singular: "",
			plural: "",
			failMessage: `${selected.toString()} has never been warned!`,
			format: member || user,
			ephemeral: true,
			showIndexes: false,
			user: interaction.user,

			generateComponents(filtered) {
				if (filtered.length > 5) {
					return [
						{
							type: ComponentType.StringSelect,
							customId: "_selectStrike",
							placeholder: "View more information on a strike",

							options: filtered.map((strike) => ({
								label: String(strike.id),
								value: String(strike.id),
							})),
						},
					];
				}
				return filtered.map((strike) => ({
					label: String(strike.id),
					style: ButtonStyle.Secondary,
					customId: `${strike.id}_strike`,
					type: ComponentType.Button,
				}));
			},
		},
	);
}
