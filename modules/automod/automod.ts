import { Constants, type Message } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import {
	GlobalAnimatedEmoji,
	GlobalBotInvitesPattern,
	InvitesPattern,
	getAllMessages,
	getBaseChannel,
} from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LogSeverity, LoggingErrorEmoji } from "../logging/misc.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import warn from "../punishments/warn.js";
import { getLevelForXp } from "../xp/misc.js";
import { xpDatabase } from "../xp/util.js";
import tryCensor, { badWordRegexps, badWordsAllowed } from "./misc.js";

const { threads } = (await config.channels.servers?.threads.fetchActive()) ?? {};
const whitelistedLinks = await Promise.all(
	threads?.map(async (thread) =>
		(await getAllMessages(thread)).flatMap(
			({ content }) =>
				content.match(InvitesPattern)?.map((link) => link.split("/").at(-1) ?? link) ?? [],
		),
	) ?? [],
);

const WHITELISTED_INVITE_GUILDS = new Set([
	config.guild.id,
	...config.otherGuildIds,
	...(await Promise.all(
		whitelistedLinks
			.flat()
			.map(async (link) => (await client.fetchInvite(link).catch(() => void 0))?.guild?.id),
	)),
	undefined, // Invalid links
]);

export default async function automodMessage(message: Message): Promise<boolean> {
	const allowBadWords = badWordsAllowed(message.channel);
	const baseChannel = getBaseChannel(message.channel);
	const pings =
		message.mentions.users.size ?
			` (ghost pinged ${joinWithAnd(message.mentions.users.map((user) => user.toString()))})`
		:	"";

	let needsDelete = false;
	let deletionMessage = "";

	const animatedEmojis =
		baseChannel?.id !== config.channels.bots?.id && message.content.match(GlobalAnimatedEmoji);
	const badAnimatedEmojis =
		animatedEmojis &&
		animatedEmojis.length > 15 &&
		Math.floor((animatedEmojis.length - 16) / 10) * PARTIAL_STRIKE_COUNT;

	if (animatedEmojis && typeof badAnimatedEmojis === "number") {
		needsDelete = true;
		await warn(
			message.author,
			`${animatedEmojis.length} animated emojis`,
			badAnimatedEmojis,
			animatedEmojis.join(""),
		);
		deletionMessage += ` Please don’t post that many animated emojis!`;
	}

	if (allowBadWords) {
		if (!needsDelete) return true;
		if (!message.deletable) {
			await log(
				`${LoggingErrorEmoji} Unable to delete ${message.url} (${deletionMessage.trim()})`,
				LogSeverity.Alert,
			);
			return true;
		}

		const publicWarn = await message.reply({
			content: `${constants.emojis.statuses.no}${deletionMessage}${pings}`,
			allowedMentions: { users: [], repliedUser: true },
		});
		await message.delete();
		setTimeout(() => publicWarn.delete(), 300_000);
		return false;
	}

	const inviteLinks = message.content.match(InvitesPattern) ?? [];
	const invites = await Promise.all(
		inviteLinks.map(
			async (link) =>
				[
					link,
					await client.fetchInvite(link.split("/").at(-1) ?? link).catch(() => void 0),
				] as const,
		),
	);

	if (
		config.channels.advertise &&
		baseChannel &&
		config.channels.advertise.id !== baseChannel.id &&
		!baseChannel.isDMBased() &&
		baseChannel.permissionsFor(baseChannel.guild.id)?.has("SendMessages")
	) {
		const badInvites = [
			...new Set(
				invites
					.filter(([, invite]) => !WHITELISTED_INVITE_GUILDS.has(invite?.guild?.id))
					.map(([link]) => link),
			),
		];

		if (badInvites.length) {
			needsDelete = true;
			await warn(
				message.author,
				`Server invite in ${message.channel.toString()}`,
				badInvites.length,
				badInvites.join("\n"),
			);
			deletionMessage += ` Please keep server invites in ${config.channels.advertise.toString()}!`;
		}

		const bots = [...new Set(message.content.match(GlobalBotInvitesPattern))];
		if (!message.author.bot && bots.length) {
			needsDelete = true;
			await warn(
				message.author,
				`Bot invite in ${message.channel.toString()}`,
				bots.length,
				bots.join("\n"),
			);
			deletionMessage += ` Please don’t post bot invites outside of ${config.channels.advertise.toString()}!`;
		}

		if (baseChannel.name.includes("general") || baseChannel.name.includes("showcase")) {
			const links = Array.from(
				new Set(message.content.match(/(https?:\/\/[^\s"')*,.:;<>\]]+)/gis) ?? []),
				(link) => new URL(link),
			).filter((link) =>
				[
					"scratch.camp",
					"scratch.love",
					"scratch.mit.edu",
					"scratch.org",
					"scratch.pizza",
					"scratch.team",

					"youtu.be",
					"youtube.com",
				].includes(link.hostname),
			);

			const level = getLevelForXp(
				xpDatabase.data.find(({ user }) => user === message.author.id)?.xp ?? 0,
			);
			const canPostLinks =
				!links.length ||
				level > 4 ||
				[(config.roles.dev?.id, config.roles.epic?.id, config.roles.booster?.id)].some(
					(role) => !message.member || (role && message.member.roles.resolve(role)),
				);

			if (!canPostLinks) {
				needsDelete = true;
				await warn(
					message.author,
					`Posted blacklisted link${
						links.length === 1 ? "" : "s"
					} in ${message.channel.toString()} while at level ${level}`,
					links.length * PARTIAL_STRIKE_COUNT,
					links.join(" "),
				);
				deletionMessage += ` Sorry, but you need level 5 to post ${
					links.length === 1 ? "that link" : "those links"
				} outside a channel like ${config.channels.advertise.toString()}!`;
			}
		}
	}

	const badWords = [
		tryCensor(stripMarkdown(message.content)),
		...message.stickers.map(({ name }) => tryCensor(name)),
		...invites.map(([, invite]) => !!invite?.guild && tryCensor(invite.guild.name)),
	].reduce(
		(bad, censored) =>
			typeof censored === "boolean" ? bad : (
				{
					strikes: bad.strikes + censored.strikes,
					words: bad.words.map((words, index) => [
						...words,
						...(censored.words[index] ?? []),
					]),
				}
			),
		{ strikes: 0, words: Array.from<string[]>({ length: badWordRegexps.length }).fill([]) },
	);
	if (badWords.strikes) needsDelete = true;

	const badEmbedWords = message.embeds
		.flatMap((embed) => [
			embed.description,
			embed.title,
			embed.footer?.text,
			embed.author?.name,
			...embed.fields.flatMap((field) => [field.name, field.value]),
		])
		.reduce(
			(bad, current) => {
				const censored = tryCensor(current || "", 1);
				return censored ?
						{
							strikes: bad.strikes + censored.strikes,
							words: bad.words.map((words, index) => [
								...words,
								...(censored.words[index] ?? []),
							]),
						}
					:	bad;
			},
			{ strikes: 0, words: Array.from<string[]>({ length: badWordRegexps.length }).fill([]) },
		);

	if (
		badEmbedWords.strikes &&
		!([...Constants.NonSystemMessageTypes] as const).includes(message.type)
	)
		needsDelete = true;

	const languageStrikes = badWords.strikes + badEmbedWords.strikes;
	if (languageStrikes) {
		const words = [...badWords.words.flat(), ...badEmbedWords.words.flat()];
		await warn(
			message.interaction?.user ?? message.author,
			words.length === 1 ? "Used a banned word" : "Used banned words",
			languageStrikes,
			words.join(", "),
		);
		deletionMessage +=
			languageStrikes < 1 ? " Please don’t say that here!" : " Please watch your language!";
	}

	if (needsDelete) {
		if (message.deletable) {
			const publicWarn = await message.reply({
				content: `${constants.emojis.statuses.no}${deletionMessage}${pings}`,
				allowedMentions: { users: [], repliedUser: true },
			});
			await message.delete();
			setTimeout(() => publicWarn.delete(), 300_000);
			return false;
		}

		await log(
			`${LoggingErrorEmoji} Unable to delete ${message.url} (${deletionMessage.trim()})`,
			LogSeverity.Alert,
		);
	} else if (badEmbedWords.strikes) {
		const publicWarn = await message.reply({
			content: `${constants.emojis.statuses.no}${deletionMessage}`,
			allowedMentions: { users: [], repliedUser: true },
		});
		await message.suppressEmbeds();
		setTimeout(() => publicWarn.delete(), 300_000);
	}

	return true;
}
