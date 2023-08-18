import {
	type APIEmbed,
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	type BaseMessageOptions,
} from "discord.js";
import { client, defineCommand } from "strife.js";
import constants from "../common/constants.js";
import { disableComponents, messageToText } from "../util/discord.js";

const MAX_FETCH_COUNT = 100;

defineCommand(
	{
		name: "purge",
		description: "(Mod only) Bulk deletes a specified amount of messages",

		options: {
			count: {
				type: ApplicationCommandOptionType.String,

				description:
					"The number of messages to purge or a message ID to delete to (inclusive)",

				required: true,
			},

			user: {
				type: ApplicationCommandOptionType.User,
				description: "Only purge messages from this user",
			},

			message: {
				type: ApplicationCommandOptionType.String,

				description: "The message ID to count backwards from (exclusive).",
			},
		},

		restricted: true,
	},

	async (interaction) => {
		const count = interaction.options.getString("count", true);
		const user = interaction.options.getUser("user") ?? undefined;
		const message =
			interaction.options.getString("message")?.match(/^(?:\d+-)?(?<id>\d+)$/)?.groups?.id ??
			undefined;
		const numberCount = Number(count);
		const useId = Number.isNaN(numberCount) || numberCount > MAX_FETCH_COUNT;
		const { channel: channelId, id: countId } = (useId &&
			count.match(/^(?:(?<channel>\d+)-)?(?<id>\d+)$/)?.groups) || { id: count };
		const channel = channelId ? await client.channels.fetch(channelId) : interaction.channel;
		if (!channel?.isTextBased() || channel.isDMBased())
			return await interaction.reply(
				`${constants.emojis.statuses.no} Could not find that channel!`,
			);
		const messages = await channel.messages.fetch({ limit: MAX_FETCH_COUNT, before: message });

		const filtered = messages
			.toJSON()
			.filter(
				(message) => (user ? message.author.id === user.id : true) && message.bulkDeletable,
			);

		let start = 0;

		let deleteTo = useId ? filtered.findIndex(({ id }) => id === countId) + 1 : numberCount;

		async function generateMessage() {
			const sliced = filtered.slice(start, deleteTo);
			if (!sliced[0] || start >= deleteTo) {
				return {
					content: `${
						constants.emojis.statuses.no
					} No messages matched those filters! Note: I cannot purge messages that are older than 2 weeks or more than ${MAX_FETCH_COUNT} messages ${
						message ? `before [this message](<${channel?.url}/${message}>)` : "ago"
					}.`,
				};
			}

			const embeds: APIEmbed[] = [];

			const last = sliced.at(-1);
			if (sliced.length > 1 && last) {
				embeds.push({
					color: last.member?.displayColor,
					description: await messageToText(last),

					author: {
						icon_url: (last.member ?? last.author).displayAvatarURL(),
						name: (last.member ?? last.author).displayName,
					},

					timestamp: last.createdAt.toISOString(),
				});
			}

			if (sliced.length > 2)
				embeds.push({
					description: `*${sliced.length - 2} more message${
						sliced.length - 2 === 1 ? "" : "s"
					}…*`,
				});

			embeds.push({
				color: sliced[0].member?.displayColor,
				description: await messageToText(sliced[0]),

				author: {
					icon_url: (sliced[0].member ?? sliced[0].author).displayAvatarURL(),
					name: (sliced[0].member ?? sliced[0].author).displayName,
				},

				timestamp: sliced[0].createdAt.toISOString(),
			});

			return {
				content: `Are you sure you want to purge th${
					sliced.length === 1 ? "is message" : `ese ${sliced.length} messages`
				}?`,
				embeds,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Link,
								label: "First Message",
								url: (last || sliced[0]).url,
							},
							{
								type: ComponentType.Button,
								customId: `first-remove-${interaction.id}`,
								style: ButtonStyle.Primary,
								disabled: start >= deleteTo - 1,
								label: "Remove First",
							},
							{
								type: ComponentType.Button,
								customId: `first-add-${interaction.id}`,
								style: ButtonStyle.Primary,
								disabled: deleteTo >= filtered.length,
								label: "Prepend One",
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								style: ButtonStyle.Link,
								label: "Last Message",
								url: sliced[0].url,
							},
							{
								type: ComponentType.Button,
								customId: `last-remove-${interaction.id}`,
								style: ButtonStyle.Primary,
								disabled: start >= deleteTo - 1,
								label: "Remove Last",
							},
							{
								type: ComponentType.Button,
								customId: `last-add-${interaction.id}`,
								style: ButtonStyle.Primary,
								disabled: start < 1,
								label: "Append One",
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								label: "Purge",
								style: ButtonStyle.Success,
								customId: `confirm-${interaction.id}`,
							},
						],
					},
				],
			} satisfies BaseMessageOptions;
		}

		const generated = await generateMessage();
		let reply = await interaction.reply({ ...generated, ephemeral: true, fetchReply: true });
		if (!generated.embeds) return;

		const collector = reply.createMessageComponentCollector({ time: constants.collectorTime });

		collector
			.on("collect", async (buttonInteraction) => {
				const split = buttonInteraction.customId.split("-");
				split.pop();

				switch (split[0]) {
					case "confirm": {
						const sliced = filtered.slice(start, deleteTo);
						await channel.bulkDelete(sliced);
						await buttonInteraction.reply(
							`${constants.emojis.statuses.yes} Purged ${sliced.length} message${
								sliced.length === 1 ? "" : "s"
							}!`,
						);
						collector.stop();
						return;
					}
					case "first": {
						if (split[1] === "remove") deleteTo--;
						else deleteTo++;
						break;
					}
					case "last": {
						if (split[1] === "remove") start++;
						else start--;
					}
				}

				await buttonInteraction.deferUpdate();

				const generated = await generateMessage();
				reply = await reply.edit(generated);

				if (generated.embeds) collector.resetTimer();
				else collector.stop();
			})
			.on("end", async () => {
				await reply.edit({ components: disableComponents(reply.components) });
			});
	},
);
