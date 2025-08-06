import type { ChatInputCommandInteraction } from "discord.js";

import { channelMention, ComponentType, MessageFlags } from "discord.js";
import mongoose from "mongoose";

import constants from "../../common/constants.ts";

export const EmbedConfig = mongoose.model(
	"EmbedConfig",
	new mongoose.Schema({
		guild: { type: String, required: true },
		enabled: { type: Boolean, default: true },
		channels: { type: Map, of: Boolean, default: {} },
	}),
);

export default async function configEmbeds(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	{ setting }: { setting?: "on-channel" | "off-channel" | "server" },
): Promise<void> {
	const config = await EmbedConfig.findOneAndUpdate(
		{ guild: interaction.guildId },
		{},
		{ new: true, upsert: true, setDefaultsOnInsert: true },
	).exec();
	switch (setting) {
		case "server": {
			config.enabled = !config.enabled;
			break;
		}
		case "on-channel": {
			config.channels.set(interaction.channelId, true);
			break;
		}
		case "off-channel": {
			config.channels.set(interaction.channelId, false);
			break;
		}
		case undefined: {
			break;
		}
	}
	await config.save();

	await interaction.reply({
		flags: MessageFlags.IsComponentsV2,

		components: [
			{
				type: ComponentType.Container,
				accentColor: constants.themeColor,
				components: [
					{ type: ComponentType.TextDisplay, content: "## Scratch Embeds Settings" },
					{
						type: ComponentType.TextDisplay,
						content: `**Enabled**: ${constants.emojis.statuses[config.enabled ? "yes" : "no"]}`,
					},
					{ type: ComponentType.TextDisplay, content: `## Channel Overrides` },
					{
						type: ComponentType.TextDisplay,
						content:
							Array.from(
								config.channels.entries(),
								([channel, status]) =>
									`${channelMention(channel)}: ${constants.emojis.statuses[status ? "yes" : "no"]}`,
							).join("\n") || "No channel overrides",
					},
				],
			},
		],
	});
}
