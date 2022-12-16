import { ChannelType, PermissionFlagsBits } from "discord.js";
import CONSTANTS from "./CONSTANTS.js";
import warn, { PARTIAL_STRIKE_COUNT } from "./warn.js";
import { stripMarkdown } from "../util/markdown.js";
import { caesar, joinWithAnd, pingablify, normalize } from "../util/text.js";
import client from "../client.js";
import { getBaseChannel, GlobalAnimatedEmoji, GlobalInvitesPattern } from "../util/discord.js";
/**
 * The index of each array determines how many strikes the word gives.
 *
 * The second sub-array is for words that must be surrounded by a word boundary.
 *
 * All words are ROT13-encoded.
 *
 * @type {[RegExp[], RegExp[]][]}
 */
const badWords = [
	[
		[
			/cbea/,
			/grfgvpyr/,
			/fpuzhpx/,
			/erpghz/,
			/ihyin/,
			/🖕/,
			/卐/,
			/fjnfgvxn/,
			/卍/,
			/lvss/,
			/ahg ?fnpx/,
		],
		[
			/intva(?:n|r|y|f|l)+/,
			/(?:urzv ?)?cravf(?:rf)?/,
			/nahf(?:rf)?/,
			/frzra/,
			/(?:c(?:er|bfg) ?)?phz/,
			/pyvg/,
			/gvg(?:(?:gvr)?f)?/,
			/chff(?:l|vrf)/,
			/fpebghz/,
			/ynovn/,
			/xlf/,
			/preivk/,
			/ubeal/,
			/obaref?/,
			/fcrez/,
		],
	],
	[
		[
			/fuv+r*g(?!nx(?:v|r))/,
			/rwnphyngr/,
			/fcyb+tr/,
			/oybj ?wbo/,
			/shpx/,
			/wvmm/,
			/wvfz/,
			/znfg(?:h|r)eong/,
			/ohgg(?: ?cvengr)/,
			/qvyqb/,
			/xhxfhtre/,
			/dhrrs/,
			/wnpx ?bss/,
			/wrex ?bss/,
			/ovg?pu/,
			/ubeal/,
		],
		[
			/(?:ovt ?)?qvp?xr?(?: ?(?:q|l|evat|ef?|urnqf?|vre?|vrfg?|vat|f|jnqf?|loveqf?))?/,
			/(?:8|o)=+Q/,
			/fzhg+(?:vr|e|fg?|l)?/,
			/pbpx(?: ?svtug|fhpx|(?:svtug|fhpx)(?:re|vat)|znafuvc|hc)?f?/,
			/onfgneq(?:vfz|(y|e)?l|evrf|f)?/,
			/phagf?/,
			/shx/,
			/ovg?fu/,
			/jnax(?:v?ref?|v(?:rfg|at)|yr|f|l)?/,
		],
	],
	[
		[
			/puvat ?(punat ?)?puba/,
			/xvxr/,
			/pnecrg ?zhapure/,
			/fyhg/,
			/fur ?znyr/,
			/shqtr ?cnpxr/,
			/ergneq/,
		],
		[
			/tbbx(?:f|l)?/,
			/yrfobf?/,
			/fcvpf?/,
			/j?uber/,
			/av+t{2,}(?:(r|h)?e|n)(?: ?rq|qbz|urnq|vat|vf(u|z)|yvat|l)?f?/,
			/snv?t+(?:rq|vr(?:e|fg)|va|vg|bgf?|bge?l|l)?f?/,
			/wnc(?:rq?|revrf|re?f|rel?|r?f|vatf?|crq|cvat|cn)?/,
		],
	],
];

if (process.env.NODE_ENV !== "production") badWords[1]?.[0].push(/automodmute/);

/** @param {RegExp[]} regexes */
function decodeRegexes(regexes) {
	return regexes
		.map(({ source }) =>
			caesar(source).replaceAll(
				/[a-z ]/gi,
				(letter) =>
					`[${
						{
							"q": "ϙϱ۹qℚoｑⓠ⒬",
							"w": "wｗሠⓦ⒲",
							"e": "e❸③３₃³⑶ꮛɛჳ⓷еₑ*ｅⓔℨ3⒠",
							"r": "rℝｒዪ尺ⓡ⒭",
							"t": "tｔፕⓣℑₜ⒯",
							"y": "vyγሃｙⓨ⒴",
							"u": "vሁυu*ሀｕⓤ⒰",
							"i": "iⁱ*ᴉjｉіⓘℹ❶①１₁¹⑴⇂⥜⓵ⅰ❗❕!¡l|1ℑ⒤",
							"o": "ዐοoₒዕ*ｏⓞ⓪⓿０₀⁰θ○⭕0⒪",
							"p": "የₚℙpｐⓟ⒫",
							"a": "aɒₐ*ａαⓐ@⒜",
							"s": "sᔆₛｓaⓢz$⒮",
							"d": "ɒdｄⓓ⒟",
							"f": "⸁fᶠｆⓕ⒡",
							"g": "gｇⓖ⒢",
							"h": "ʜhₕｈክዪዘℜℍⓗℌ#⒣",
							"j": "jⱼյｊⓙℑ⒥",
							"k": "kₖｋⓚ⒦",
							"l": "ₗｌⓛl|⒧",
							"z": "zᙆᶻｚℤs乙ⓩ⒵",
							"x": "xᕽₓｘⓧﾒ⒳",
							"c": "cᑦᶜℂｃℭⓒ⒞",
							"v": "vⱽｖ√✅u☑✔ⓥ⒱",
							"b": "ｂⓑb⒝d",
							"n": "ⁿₙnሸℕｎⓝ⒩",
							"m": "ₘｍʍﾶጠⓜⓂ️m⒨",
							" ": "-",
						}[letter] || ""
					}${letter}]`,
			),
		)
		.join("|");
}
const badWordRegexps = badWords.map(
	([strings, words]) =>
		new RegExp(decodeRegexes(strings) + "|\\b(?:" + decodeRegexes(words) + ")\\b", "gi"),
);

/** @param {string} text */
export function censor(text) {
	/** @type {string[][]} */
	const words = [];
	const censored = badWordRegexps.reduce((string, regexp, index) => {
		words[index] ??= [];
		return string.replaceAll(regexp, (censored) => {
			words[index]?.push(censored);
			return censored[0] + "#".repeat(censored.length - 1);
		});
	}, normalize(text));

	return words.flat().length
		? {
				censored,
				strikes: words.reduce(
					(acc, curr, index) => curr.length * Math.max(index, PARTIAL_STRIKE_COUNT) + acc,
					0,
				),
				words,
		  }
		: false;
}

/**
 * @param {string} toCensor
 * @param {import("discord.js").Message | import("discord.js").PartialMessage} message
 */
async function checkString(toCensor, message) {
	/**
	 * @type {{
	 * 	language: false | number;
	 * 	invites: false | number;
	 * 	bots: false | number;
	 * 	words: { language: string[]; invites: string[]; bots: string[] };
	 * }}
	 */
	const bad = {
		language: false,
		invites: false,
		bots: false,
		words: { language: [], invites: [], bots: [] },
	};
	if (!badWordsAllowed(message.channel)) {
		const censored = censor(toCensor);
		if (censored) {
			bad.words.language.push(...censored.words.flat());
			bad.language = censored.strikes;
		}
	}

	const baseChannel = getBaseChannel(message.channel);
	const parentChannel =
		baseChannel && baseChannel.isDMBased() ? baseChannel : baseChannel?.parent;

	if (
		!badWordsAllowed(message.channel) &&
		CONSTANTS.channels.info?.id !== parentChannel?.id &&
		CONSTANTS.channels.advertise?.id !== baseChannel?.id &&
		!message.author?.bot
	) {
		const botLinks = toCensor.match(/discord(?:app)?\.com\/(api\/)?oauth2\/authorize/gi);
		if (botLinks) {
			bad.words.bots.push(...botLinks);
			bad.bots = botLinks.length;
		}

		const inviteCodes = toCensor.match(GlobalInvitesPattern);

		if (inviteCodes) {
			const invitesToDelete = (
				await Promise.all(
					inviteCodes.map(async (code) => {
						const invite = await client?.fetchInvite(code).catch(() => {});
						return invite?.guild && invite.guild.id !== message.guild?.id && code;
					}),
				)
			).filter(/** @returns {toWarn is string} */ (toWarn) => !!toWarn);

			if (invitesToDelete.length) {
				bad.words.invites.push(...invitesToDelete);
				bad.invites = invitesToDelete.length;
			}
		}
	}

	return bad;
}

/** @param {import("discord.js").Message} message */
export async function automodMessage(message) {
	const bad = (
		await Promise.all([
			checkString(stripMarkdown(message.content), message),
			...message.stickers.map(({ name }) => checkString(name, message)),
		])
	).reduce(
		(bad, censored) => {
			return {
				language:
					typeof censored.language === "number"
						? +bad.language + censored.language
						: bad.language,

				invites:
					typeof censored.invites === "number"
						? +bad.invites + censored.invites
						: bad.invites,

				bots: typeof censored.bots === "number" ? +bad.bots + censored.bots : bad.bots,
				words: {
					language: [...censored.words.language, ...bad.words.language],
					invites: [...censored.words.invites, ...bad.words.invites],
					bots: [...censored.words.bots, ...bad.words.bots],
				},
			};
		},
		{
			language: false,
			invites: false,
			bots: false,
			words: { language: [], invites: [], bots: [] },
		},
	);

	const toWarn = [bad.language, bad.invites, bad.bots].filter(
		/** @returns {strikes is number} */ (strikes) => strikes !== false,
	);

	const embedStrikes = badWordsAllowed(message.channel)
		? false
		: message.embeds
				.map((embed) => [
					embed.description && embed.description,
					embed.title,
					embed.footer?.text,
					embed.author?.name,
					...embed.fields.map((field) => [field.name, field.value]).flat(),
				])
				.flat()
				.reduce((strikes, current) => {
					const censored = current && censor(current);
					if (censored) {
						bad.words.language.push(...censored.words.flat());
					}
					return censored ? +strikes + censored.strikes : strikes;
				}, /** @type {number | false} */ (false));

	if (typeof embedStrikes === "number") {
		bad.language = (bad.language || 0) + Math.max(embedStrikes - 1, 0);
	}

	const promises = [];
	if (toWarn.length) promises.push(message.delete());
	else if (typeof embedStrikes === "number") promises.push(message.suppressEmbeds());

	if (typeof bad.language === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Watch your language!",
				bad.language,
				"Sent message with words:\n" + bad.words.language.join("\n"),
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(message.interaction?.user || message.author).toString()}, language!`,
			),
		);
	}
	if (typeof bad.invites === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Please don’t send server invites in that channel!",
				bad.invites,
				bad.words.invites.join("\n"),
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, only post invite links in ${CONSTANTS.channels.advertise?.toString()}!`,
			),
		);
	}
	if (typeof bad.bots === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Please don’t post bot invite links!",
				bad.bots,
				bad.words.bots.join("\n"),
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, bot invites go to ${CONSTANTS.channels.advertise?.toString()}!`,
			),
		);
	}

	const animatedEmojis = [...message.content.matchAll(GlobalAnimatedEmoji)];

	const badAnimatedEmojis =
		animatedEmojis.length > 9 && Math.round((animatedEmojis.length - 10) / 10);

	if (
		getBaseChannel(message.channel)?.id !== CONSTANTS.channels.bots?.id &&
		typeof badAnimatedEmojis === "number"
	) {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				`Please don’t post that many animated emojis!`,
				badAnimatedEmojis,
				animatedEmojis.map((emoji) => emoji[0]).join("\n"),
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, lay off on the animated emojis please!`,
			),
			message.delete(),
		);
	}

	await Promise.all(promises);

	return toWarn.length > 0;
}
/** @param {import("discord.js").TextBasedChannel | null} channel */
export function badWordsAllowed(channel) {
	const baseChannel = getBaseChannel(channel);
	return (
		baseChannel?.type === ChannelType.DM ||
		!baseChannel?.permissionsFor(baseChannel.guild.id)?.has(PermissionFlagsBits.ViewChannel)
	);
}

const NICKNAME_RULE = 8;

/** @param {import("discord.js").GuildMember} member */
export async function changeNickname(member, shouldWarn = true) {
	const censored = censor(member.displayName);

	if (censored) {
		await Promise.all([
			shouldWarn
				? warn(member, "Watch your language!", censored.strikes, member.displayName)
				: member
						.send(
							CONSTANTS.emojis.statuses.no +
								" I censored some bad words in your username. If you change your nickname to include bad words, you may be warned.",
						)
						.catch(() => {}),
			setNickname(member, pingablify(censored.censored)),
		]);
	}

	const pingablified = pingablify(member.displayName);

	if (pingablified !== member.displayName) {
		await Promise.all([
			setNickname(member, pingablified),
			member
				.send(
					`⚠ For your information, I automatically removed non-easily-pingable characters from your nickname to comply with rule ${NICKNAME_RULE}. You may change it to something else that’s easily typable on American English keyboards if you dislike what I chose.`,
				)
				.catch(() => {}),
		]);
		return;
	}

	const members = (
		await CONSTANTS.guild.members.fetch({
			query: member.displayName,
			limit: 100,
		})
	).filter((found) => found.displayName === member.displayName);

	/** @type {any[]} */
	const promises = [];
	if (members.size > 1) {
		const [safe, unsafe] = members.partition(
			(found) => found.user.username === member.displayName,
		);

		if (safe.size) {
			promises.push(
				...unsafe
					.map((found) => [
						setNickname(found, found.user.username),

						found
							.send(
								`⚠ Your nickname conflicted with someone else’s nickname, so I unfortunately had to change it to comply with rule ${NICKNAME_RULE}.`,
							)
							.catch(() => {}),
					])
					.flat(),
			);
			if (safe.size > 1) {
				promises.push(
					CONSTANTS.channels.modlogs?.send({
						allowedMentions: { users: [] },
						content: `⚠ Conflicting nicknames: ${joinWithAnd(safe.toJSON())}.`,
					}),
				);
			}
		} else if (
			unsafe.size > 1 &&
			unsafe.has(member.id) &&
			(await setNickname(member, member.user.username))
		) {
			unsafe.delete(member.id);
		}

		if (unsafe.size > 1)
			promises.push(
				CONSTANTS.channels.modlogs?.send({
					allowedMentions: { users: [] },
					content: `⚠ Conflicting nicknames: ${joinWithAnd(unsafe.toJSON())}.`,
				}),
			);
	}
	await Promise.all(promises);
}

/**
 * @param {import("discord.js").GuildMember} member
 * @param {string} newNickname
 */
async function setNickname(member, newNickname) {
	if (member.nickname === newNickname) return member;
	if (member.moderatable) {
		if (censor(newNickname) || pingablify(newNickname) !== newNickname) return false;

		return await member.setNickname(newNickname, `To comply with rule ${NICKNAME_RULE}`);
	}
	await CONSTANTS.channels.modlogs?.send({
		allowedMentions: { users: [] },
		content: `⚠ Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\`.`,
	});
	return false;
}
