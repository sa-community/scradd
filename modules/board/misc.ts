import {
	type APIButtonComponent,
	type BaseMessageOptions,
	ButtonStyle,
	ComponentType,
	Message,
	MessageType,
	type Snowflake,
	type TextBasedChannel,
} from "discord.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";
import { extractMessageExtremities, getBaseChannel, messageToText } from "../../util/discord.js";
import censor from "../automod/language.js";

if (!config.channels.board) throw new ReferenceError("Could not find board channel");
const { board } = config.channels;
export const BOARD_EMOJI = "🥔",
	REACTIONS_NAME = "Potatoes";

export const boardDatabase = new Database<{
	/** The number of reactions this message has. */
	reactions: number;
	/** The ID of the user who posted this. */
	user: Snowflake;
	/** The ID of the channel this message is in. */
	channel: Snowflake;
	/** The ID of the message on the board. */
	onBoard: Snowflake | 0;
	/** The ID of the original message. */
	source: Snowflake;
}>("board");
await boardDatabase.init();

/**
 * Determines the board reaction count for a channel.
 *
 * @param channel - The channel to determine reaction count for.
 *
 * @returns The reaction count.
 */
export function boardReactionCount(channel?: TextBasedChannel): number {
	const COUNTS = {
		scradd: 2,
		admins: 2,
		exec: 3,
		mods: 4,
		misc: 5,
		default: 6,
		memes: 8,
		info: 12,
	};

	if (process.env.NODE_ENV !== "production") return COUNTS.scradd;

	if (channel?.id === config.channels.updates?.id) return COUNTS.info;
	const baseChannel = getBaseChannel(channel);
	if (!baseChannel || baseChannel.isDMBased()) return COUNTS.default;
	if (baseChannel.isVoiceBased()) return COUNTS.misc;

	return (
		{
			[config.channels.tickets?.id || ""]: COUNTS.mods,
			[config.channels.mod?.id || ""]: COUNTS.mods,
			[config.channels.modlogs?.id || ""]: COUNTS.mods,
			[config.channels.exec?.id || ""]: COUNTS.exec,
			[config.channels.admin?.id || ""]: COUNTS.admins,
			"853256939089559583": COUNTS.misc,
			"869662117651955802": COUNTS.misc,
			"811065897057255424": COUNTS.memes,
			"806609527281549312": COUNTS.memes,
			"806656240129671188": COUNTS.memes,
			[config.channels.advertise?.id || ""]: COUNTS.memes,
			[config.channels.old_suggestions?.id || ""]: COUNTS.default,
		}[baseChannel.id] ||
		{ [config.channels.info?.id || ""]: COUNTS.info }[baseChannel.parent?.id || ""] ||
		COUNTS.default
	);
}

/**
 * Generate an embed and button to represent a board message with.
 *
 * @param info - Info to generate a message from.
 * @param extraButtons - Extra custom buttons to show.
 *
 * @returns The representation of the message.
 */
export async function generateBoardMessage(
	info: typeof boardDatabase.data[number] | Message,
	extraButtons: { pre?: APIButtonComponent[]; post?: APIButtonComponent[] } = {},
): Promise<BaseMessageOptions | undefined> {
	const count =
		info instanceof Message ? info.reactions.resolve(BOARD_EMOJI)?.count || 0 : info.reactions;

	/**
	 * Convert a message to an embed and button representation.
	 *
	 * @param message - The message to convert.
	 *
	 * @returns The converted message.
	 */
	async function messageToBoardData(message: Message): Promise<BaseMessageOptions> {
		const { files, embeds } = extractMessageExtremities(message, censor);

		const description = await messageToText(message);

		const censored = censor(description);
		const censoredName = censor(message.author.username);

		while (embeds.length > 9) embeds.pop(); // 9 and not 10 because we still need to add ours

		return {
			allowedMentions: { users: [] },

			components: [
				{
					type: ComponentType.ActionRow,

					components: [
						...(extraButtons.pre || []),
						{
							label: "View Context",
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							url: message.url,
						},
						...(extraButtons.post || []),
					],
				},
			],

			content: `**${BOARD_EMOJI} ${count}** | ${
				message.channel.isThread() && message.channel.parent
					? `${message.channel.toString()} (${message.channel.parent.toString()})`
					: message.channel.toString()
			} | ${message.author.toString()}`,

			embeds: [
				{
					color:
						message.type === MessageType.AutoModerationAction
							? 0x99a1f2
							: message.member?.displayColor,
					description: censored ? censored.censored : description,

					author: {
						icon_url:
							message.type === MessageType.AutoModerationAction
								? "https://discord.com/assets/e7af5fc8fa27c595d963c1b366dc91fa.gif"
								: (message.member ?? message.author).displayAvatarURL(),

						name:
							message.type === MessageType.AutoModerationAction
								? "AutoMod 🤖"
								: (message.member?.displayName ??
										(censoredName
											? censoredName.censored
											: message.author.username)) +
								  (message.author.bot ? " 🤖" : ""),
					},

					timestamp: message.createdAt.toISOString(),
				},
				...embeds,
			],

			files,
		};
	}

	if (info instanceof Message) return await messageToBoardData(info);

	const onBoard = info.onBoard && (await board.messages.fetch(info.onBoard).catch(() => {}));

	if (onBoard) {
		const linkButton = onBoard.components?.[0]?.components?.[0];
		const buttons =
			linkButton?.type === ComponentType.Button
				? [...(extraButtons.pre || []), linkButton.toJSON(), ...(extraButtons.post || [])]
				: [...(extraButtons.pre || []), ...(extraButtons.post || [])];

		return {
			allowedMentions: { users: [] },

			components:
				buttons.length > 0 ? [{ type: ComponentType.ActionRow, components: buttons }] : [],

			content: onBoard.content,
			embeds: onBoard.embeds.map((oldEmbed) => oldEmbed.data),
			files: onBoard.attachments.map((attachment) => attachment),
		};
	}

	const channel = await config.guild.channels.fetch(info.channel).catch(() => {});

	if (!channel?.isTextBased()) return;

	const message = await channel.messages.fetch(info.source).catch(() => {});

	if (!message) return;

	return await messageToBoardData(message);
}
