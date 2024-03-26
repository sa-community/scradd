import { ApplicationCommandOptionType } from "discord.js";
import { uwuEndings, uwuReplacements } from "../../../common/strings.js";
import { stripMarkdown } from "../../../util/markdown.js";
import type { CustomOperation } from "../util.js";

export function uwuify(text: string): string {
	const output = stripMarkdown(text)
		.split(/\s+/)
		.map((word) =>
			/^(?:https?:\/\/|(?:(.)\1*|<.+>)$)/.test(word) ? word : (
				uwuReplacements[word.toLowerCase()] ?? convertWord(word)
			),
		);

	output.push(uwuEndings[Math.floor(Math.random() * uwuEndings.length)] ?? uwuEndings[0]);
	return output.join(" ");
}
function convertWord(word: string): string {
	const uwuified = word
		.toLowerCase()
		.replaceAll(/[\p{Pi}\p{Pf}＂＇'"`՚’]/gu, "")
		.replaceAll(/[lr]/g, "w")
		.replaceAll(/n(?=[aeo])/g, "ny")
		.replaceAll(/(?<![aeiouy])y+\b/g, ({ length }) => "i".repeat(length));
	return uwuified[0] && Math.random() > 0.8 ? `${uwuified[0]}-${uwuified}` : uwuified;
}

const data: CustomOperation = {
	name: "uwu",
	description: uwuify("Uwuify provided text"),
	censored: "channel",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "text",
			description: uwuify("The text to uwuify"),
			required: true,
			maxLength: 1000,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "ephemeral",
			description: uwuify("Make the response only visible to you"),
			required: false,
		},
	],
	async command(interaction, { text, ephemeral }) {
		await interaction.reply({
			content: uwuify(
				(typeof text === "string" ? text : "") +
					(typeof ephemeral === "string" && !["true", "false"].includes(ephemeral) ?
						" " + ephemeral
					:	""),
			),
			ephemeral: ephemeral === "true",
		});
	},
};
export default data;
