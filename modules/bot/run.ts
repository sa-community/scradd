import {
	ChatInputCommandInteraction,
	ComponentType,
	ModalSubmitInteraction,
	TextInputStyle,
	User,
} from "discord.js";
import { client } from "strife.js";
import constants from "../../common/constants.js";
import { generateError } from "../../common/logError.js";

export default async function getCode(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const { owner } = await client.application.fetch();
	const owners =
		owner instanceof User ? [owner.id] : owner?.members.map((member) => member.id) ?? [];
	if (process.env.NODE_ENV === "production" && !owners.includes(interaction.user.id))
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} This command is reserved for ${
				owner instanceof User ? owner.displayName : "the " + owner?.name + " team"
			} only!`,
		});

	await interaction.showModal({
		title: "Run Code",
		customId: "_run",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Paragraph,
						label: "Code to run",
						required: true,
						customId: "code",
					},
				],
			},
		],
	});
}

export async function run(interaction: ModalSubmitInteraction) {
	await interaction.deferReply();
	const code = interaction.fields.getTextInputValue("code").trim();
	try {
		const output: unknown = await eval(
			`(async () => {${
				code.includes("\n") || code.includes("return") ? code : `return ${code}`
			}})()`,
		);

		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{
					attachment: Buffer.from(
						typeof output === "bigint" || typeof output === "symbol"
							? // eslint-disable-next-line unicorn/string-content
							  `"${output.toString().replaceAll('"', '\\"')}"`
							: typeof output === "function"
							? output.toString()
							: typeof output === "object"
							? JSON.stringify(output, undefined, "  ")
							: output === undefined
							? "undefined"
							: // eslint-disable-next-line @typescript-eslint/no-base-to-string
							  output.toString(),
						"utf8",
					),
					name: `output.${
						"string" === typeof output
							? "txt"
							: "function" === typeof output
							? "js"
							: "json"
					}`,
				},
			],
		});
	} catch (error) {
		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{ attachment: Buffer.from(generateError(error), "utf8"), name: "error.json" },
			],
		});
	}
}
