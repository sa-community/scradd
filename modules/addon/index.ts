import type { AutocompleteInteraction } from "discord.js";

import addons from "@sa-community/addons-data" with { type: "json" };
import scratchAddons from "@sa-community/addons-data/manifest.json" with { type: "json" };
import { ApplicationCommandOptionType, ButtonStyle, ComponentType, hyperlink } from "discord.js";
import { matchSorter } from "match-sorter";
import { defineChatCommand, escapeAllMarkdown } from "strife.js";

import constants from "../../common/constants.ts";

export const addonSearchOptions = {
	keys: [
		({ addonId }: (typeof addons)[number]): string => addonId.replaceAll("-", " "),
		"addonId",
		"manifest.name",
		"manifest.description",
		"manifest.settings.*.name",
		"manifest.credits.*.name",
		"manifest.presets.*.name",
		"manifest.presets.*.description",
	],
};

defineChatCommand(
	{
		name: "addon",
		description: `Get information about an addon as of v${scratchAddons.version_name}`,

		options: {
			addon: {
				autocomplete(interaction: AutocompleteInteraction) {
					return matchSorter(
						addons,
						interaction.options.getString("addon") ?? "",
						addonSearchOptions,
					).map((addon) => ({ name: addon.manifest.name, value: addon.addonId }));
				},
				description: "The addon to show",
				required: true,
				type: ApplicationCommandOptionType.String,
			},
		},
		access: true,
	},

	async (interaction, options) => {
		const { manifest: addon, addonId } =
			matchSorter(addons, options.addon, addonSearchOptions)[0] ?? {};

		if (!addon || !addonId) {
			await interaction.reply({
				content: `${constants.emojis.statuses.no} Could not find a matching addon!`,

				ephemeral: true,
			});

			return;
		}

		const group =
			addon.tags.includes("popup") ? "Extension Popup Features"
			: addon.tags.includes("easterEgg") ? "Easter Eggs"
			: addon.tags.includes("theme") ?
				`Themes → ${addon.tags.includes("editor") ? "Editor" : "Website"} Themes`
			: addon.tags.includes("community") ?
				`Scratch Website Features → ${
					addon.tags.includes("profiles") ? "Profiles"
					: addon.tags.includes("projectPage") ? "Project Pages"
					: addon.tags.includes("forums") ? "Forums"
					: "Others"
				}`
			:	`Scratch Editor Features → ${
					addon.tags.includes("codeEditor") ? "Code Editor"
					: addon.tags.includes("costumeEditor") ? "Costume Editor"
					: addon.tags.includes("projectPlayer") ? "Project Player"
					: "Others"
				}`;

		const credits = new Intl.ListFormat().format(
			addon.credits?.map((credit) =>
				credit.note || credit.link ?
					hyperlink(
						credit.name,
						credit.link ?? interaction.channel?.url ?? "",
						credit.note ?? "",
					)
				:	credit.name,
			) ?? [],
		);

		const updateInfo = `v${addon.versionAdded}${
			addon.latestUpdate?.version ?
				` (${hyperlink(
					`last updated in v${addon.latestUpdate.version}`,
					interaction.channel?.url ?? "",
					addon.latestUpdate.temporaryNotice ?? "",
				)})`
			:	""
		}`;

		await interaction.reply({
			embeds: [
				{
					description: `${escapeAllMarkdown(addon.description)}\n${
						addon.permissions?.length ?
							"\n\n**⚠️ This addon may require additional permissions to be granted in order to function.**"
						:	""
					}`,

					fields: [
						...(credits.length ?
							[{ inline: true, name: "🫂 Contributors", value: credits }]
						:	[]),
						{ inline: true, name: "📦 Group", value: escapeAllMarkdown(group) },
						{ inline: true, name: "📝 Version added", value: updateInfo },
					],

					color: constants.themeColor,
					footer: { text: addonId },
					thumbnail: { url: `${constants.urls.addonImages}/${addonId}.png` },
					title: addon.name,
					url: `https://github.com/ScratchAddons/ScratchAddons/tree/v${scratchAddons.version}/addons/${addonId}/`,
				},
			],

			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							url: `${constants.urls.settings}#addon-${addonId}`,
							label: "Enable Addon",
						},
					],
				},
			],
		});
	},
);
