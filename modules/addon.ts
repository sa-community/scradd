import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	hyperlink,
	AutocompleteInteraction,
} from "discord.js";
import { matchSorter } from "match-sorter";
import constants from "../common/constants.js";
import { manifest, addons, addonSearchOptions } from "../common/extension.js";
import { defineChatCommand } from "strife.js";
import { escapeMessage, tooltip } from "../util/markdown.js";
import { joinWithAnd } from "../util/text.js";

defineChatCommand(
	{
		name: "addon",
		censored: "channel",
		description: `Replies with information about a specific addon available in v${
			manifest.version_name ?? manifest.version
		}`,

		options: {
			addon: {
				autocomplete(interaction: AutocompleteInteraction) {
					return matchSorter(
						addons,
						interaction.options.getString("addon") ?? "",
						addonSearchOptions,
					).map((addon) => ({
						name: addon.name,
						value: addon.id,
					}));
				},
				description: "The name of the addon",
				required: true,
				type: ApplicationCommandOptionType.String,
			},
		},
		access: true,
	},

	async (interaction, options) => {
		const addon = matchSorter(addons, options.addon, addonSearchOptions)[0];

		if (!addon) {
			await interaction.reply({
				content: `${constants.emojis.statuses.no} Could not find a matching addon!`,

				ephemeral: true,
			});

			return;
		}

		const group = addon.tags.includes("popup")
			? "Extension Popup Features"
			: addon.tags.includes("easterEgg")
			? "Easter Eggs"
			: addon.tags.includes("theme")
			? `Themes → ${addon.tags.includes("editor") ? "Editor" : "Website"} Themes`
			: addon.tags.includes("community")
			? `Scratch Website Features → ${
					addon.tags.includes("profiles")
						? "Profiles"
						: addon.tags.includes("projectPage")
						? "Project Pages"
						: addon.tags.includes("forums")
						? "Forums"
						: "Others"
			  }`
			: `Scratch Editor Features → ${
					addon.tags.includes("codeEditor")
						? "Code Editor"
						: addon.tags.includes("costumeEditor")
						? "Costume Editor"
						: addon.tags.includes("projectPlayer")
						? "Project Player"
						: "Others"
			  }`;

		const credits = joinWithAnd(addon.credits ?? [], (credit) => {
			const note = ("note" in credit && credit.note) || "";
			return credit.link
				? hyperlink(credit.name, credit.link, note)
				: tooltip(credit.name, note, interaction.guild?.id);
		});

		const lastUpdatedIn =
			addon.latestUpdate?.version && `last updated in v${addon.latestUpdate.version}`;

		await interaction.reply({
			embeds: [
				{
					color: constants.themeColor,

					description:
						`${escapeMessage(addon.description)}\n` +
						(addon.permissions?.length
							? "\n\n**⚠ This addon may require additional permissions to be granted in order to function.**"
							: ""),
					fields: [
						...(addon.credits
							? [{ inline: true, name: "🫂 Contributors", value: credits }]
							: []),
						{ inline: true, name: "📦 Group", value: escapeMessage(group) },
						{
							inline: true,
							name: "📝 Version added",

							value: `v${addon.versionAdded}${
								addon.latestUpdate && lastUpdatedIn
									? ` (${tooltip(
											lastUpdatedIn,
											addon.latestUpdate.temporaryNotice,
											interaction.guild?.id,
									  )})`
									: ""
							}`,
						},
					],

					footer: { text: addon.id },

					thumbnail: {
						url: `${constants.urls.addonImageRoot}/${encodeURIComponent(addon.id)}.png`,
					},

					title: addon.name,

					url: `https://github.com/${constants.urls.saRepo}/tree/${
						manifest.version_name?.endsWith("-prerelease")
							? "master"
							: `v${encodeURI(manifest.version)}`
					}/addons/${encodeURIComponent(addon.id)}/`,
				},
			],

			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							url: `${constants.urls.settingsPage}#addon-${encodeURIComponent(
								addon.id,
							)}`,
							label: "Enable Addon",
						},
					],
				},
			],
		});
	},
);
