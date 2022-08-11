import { automodMessage } from "../../common/moderation/automod.js";
import log from "../../common/moderation/logging.js";
import { extractMessageExtremities } from "../../lib/message.js";
import jsonDiff from "json-diff";
import { AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import diffLib from "difflib";
import { MessageActionRowBuilder } from "../../types/ActionRowBuilder.js";

/** @type {import("../../types/event").default<"messageUpdate">} */
const event = {
	async event(oldMessage, newMessage) {
		if (newMessage.partial) newMessage = await newMessage.fetch();
		if (!newMessage.guild || newMessage.guild.id !== process.env.GUILD_ID) return;
		const logs = [];
		if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
			logs.push(
				`Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
					newMessage.flags.has("Crossposted") ? "" : "un"
				}published`,
			);
		}
		if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
			log(
				newMessage.guild,
				`Embeds ${
					newMessage.flags.has("SuppressEmbeds") ? "hidden" : "shown"
				} on message by ${newMessage.author.toString()} in ${newMessage.channel.toString()}` +
					"!",
				"messages",
				{ embeds: newMessage.embeds.map((embed) => EmbedBuilder.from(embed)) },
			);
		}
		if (oldMessage.pinned !== null && oldMessage.pinned !== newMessage.pinned) {
			logs.push(
				`Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
					newMessage.pinned ? "" : "un"
				}pinned`,
			);
		}
		if (!oldMessage.partial && !newMessage.author.bot) {
			const files = [];
			const contentDiff =
				oldMessage.content !== null &&
				diffLib
					.unifiedDiff(
						(oldMessage.content ?? "").split("\n"),
						newMessage.content.split("\n"),
					)
					.join("\n");

			const extraDiff = jsonDiff.diffString(
				await getMessageJSON(oldMessage),
				await getMessageJSON(newMessage),
				{ color: false },
			);

			if (contentDiff)
				files.push(
					new AttachmentBuilder(
						Buffer.from(
							contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
							"utf-8",
						),
						{ name: "content.diff" },
					),
				);

			if (extraDiff)
				files.push(
					new AttachmentBuilder(Buffer.from(extraDiff, "utf-8"), { name: "extra.diff" }),
				);

			if (files.length)
				log(
					newMessage.guild,
					`Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited!`,
					"messages",
					{ files },
				);
		}

		await Promise.all(
			logs.map(
				(edit) =>
					newMessage.guild &&
					log(newMessage.guild, edit + "!", "messages", {
						components: [
							new MessageActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setEmoji("👀")
									.setLabel("View Message")
									.setStyle(ButtonStyle.Link)
									.setURL(newMessage.url),
							),
						],
					}),
			),
		);
		if (await automodMessage(newMessage)) return;
	},
};

export default event;

/** @param {import("discord.js").Message | import("discord.js").PartialMessage} message */
async function getMessageJSON(message) {
	const { embeds, files } = await extractMessageExtremities(message);

	return {
		components: message.components.map((component) => component.toJSON()),
		embeds: embeds,
		files: files,
	};
}
