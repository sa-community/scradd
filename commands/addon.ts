import { SlashCommandBuilder, EmbedBuilder, escapeMarkdown, hyperlink } from "discord.js";
import Fuse from "fuse.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { manifest, addons } from "../common/extension.js";
import { getBaseChannel } from "../lib/discord.js";

import { escapeMessage, escapeLinks, generateTooltip } from "../lib/markdown.js";
import { joinWithAnd } from "../lib/text.js";
import type { ChatInputCommand } from "../common/types/command";

const fuse = new Fuse(addons, {
	findAllMatches: true,
	ignoreLocation: true,
	includeScore: true,

	keys: [
		{ name: "id", weight: 1 },
		{ name: "name", weight: 1 },
		{ name: "description", weight: 0.5 },
	],
});

const info: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setDescription(
			`Replies with information about a specific addon available in v${
				manifest.version_name || manifest.version
			}`,
		)
		.addStringOption((option) =>
			option.setName("addon").setDescription("The name of the addon").setRequired(true),
		)
		.addBooleanOption((input) =>
			input
				.setName("compact")
				.setDescription("Whether to show misc information and the image")
				.setRequired(false),
		),

	async interaction(interaction) {
		const input = interaction.options.getString("addon", true);
		const { item: addon, score = 0 } = fuse.search(input)[0] ?? {};

		const compact =
			interaction.options.getBoolean("compact") ??
			getBaseChannel(interaction.channel)?.id !== CONSTANTS.channels.bots;

		if (!addon || (score > 0.5 && compact)) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Could not find a matching addon!`,

				ephemeral: true,
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(addon.name)
			.setColor(CONSTANTS.themeColor)
			.setDescription(
				`${escapeMessage(addon.description)}\n` +
					`[See source code](${CONSTANTS.urls.saSource}/addons/${encodeURIComponent(
						addon.id,
					)}/)`,
			)
			.setFooter({
				text:
					Math.round((1 - score) * 100) +
					"% match" +
					CONSTANTS.footerSeperator +
					(compact ? "Compact mode" : addon.id),
			})
			[compact ? "setThumbnail" : "setImage"](
				`${CONSTANTS.urls.addonImageRoot}/${encodeURIComponent(addon.id)}.png`,
			);

		const group = addon.tags.includes("popup")
			? "Extension Popup Features"
			: addon.tags.includes("easterEgg")
			? "Easter Eggs"
			: addon.tags.includes("theme")
			? `Themes -> ${addon.tags.includes("editor") ? "Editor" : "Website"} Themes?`
			: addon.tags.includes("community")
			? "Scratch Website Features -> " +
			  (addon.tags.includes("profiles")
					? "Profiles"
					: addon.tags.includes("projectPage")
					? "Project Pages"
					: addon.tags.includes("forums")
					? "Forums"
					: "Others")
			: "Scratch Editor Features -> " +
			  (addon.tags.includes("codeEditor")
					? "Code Editor"
					: addon.tags.includes("costumeEditor")
					? "Costume Editor"
					: addon.tags.includes("projectPlayer")
					? "Project Player"
					: "Others");

		if (group !== "Easter Eggs") {
			embed.setURL(
				`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${encodeURIComponent(
					addon.id,
				)}`,
			);
		}

		if (!compact) {
			const lastUpdatedIn = `last updated in v${
				addon.latestUpdate?.version ?? "<unknown version>"
			}`;

			const credits = joinWithAnd(
				addon.credits?.map((credit) => {
					const note = ("note" in credit ? credit.note : undefined) || "";
					return credit.link
						? hyperlink(escapeLinks(credit.name), credit.link, note)
						: interaction.channel
						? generateTooltip(interaction.channel, credit.name, note)
						: credit.name;
				}) ?? [],
			);

			if (credits)
				embed.addFields({
					name: "🫂 Contributors",
					value: escapeMarkdown(credits),
					inline: true,
				});

			if (addon.permissions?.length)
				embed.setDescription(
					embed.data.description +
						"\n" +
						"\n" +
						"**⚠ This addon may require additional permissions to be granted in order to function.**",
				);

			embed.addFields(
				{ inline: true, name: "📦 Group", value: escapeMarkdown(group) },
				{
					inline: true,
					name: "📝 Version added",
					value: escapeMarkdown(
						"v" +
							addon.versionAdded +
							(addon.latestUpdate
								? ` (${
										interaction.channel
											? generateTooltip(
													interaction.channel,
													lastUpdatedIn,
													`${addon.latestUpdate?.temporaryNotice}`,
											  )
											: lastUpdatedIn
								  })`
								: ""),
					),
				},
			);
		}

		await interaction.reply({ embeds: [embed] });
	},

	censored: "channel",
};
export default info;
