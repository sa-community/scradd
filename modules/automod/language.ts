import { ChannelType, PermissionFlagsBits, type TextBasedChannel } from "discord.js";
import badWords from "./badWords.js";
import { getBaseChannel } from "../../util/discord.js";
import { caesar, normalize } from "../../util/text.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";

function decodeRegexps(regexps: RegExp[]) {
	return regexps
		.map(({ source }) =>
			caesar(source).replaceAll(
				/[ a-z]/gi,
				(letter) =>
					`[${letter}${
						{
							" ": "^w",
							"a": "⒜@*⍺₳4aａⓐAＡᵃₐᴬåǟÃąẚᴀɐɑɒαΑΔΛаАคภᎪᗅᗩꓮ-",
							"b": "⒝฿8bｂⓑℬʙɓꞵƅβвьҍⴆცꮟᏸᏼᑲᖯᗷꓐ",
							"c": "⒞¢₵cｃⅽⓒℂℭᶜᴄƈϲⲥсꮯᐸᑕᑢᑦꓚ匚",
							"d": "⒟ɒdｄⅾⅆⓓⅅđðᴅɖԁԃժꭰꮷᑯᗞᗪꓒꓓ𝐃",
							"e": "⒠*℮⋿£3ɐeｅⅇℯⓔℰₑᴇꬲɛεеєҽⴹꭼꮛꓰ𝐄-",
							"f": "⒡⸁₣fｆⓕℱᶠꜰꬵꞙƒʄſẝϝғքᖴꓝ𝐅",
							"g": "⒢₲gｇℊⓖɡɢᶃɠƍԍցꮆꮐᏻꓖ𝐆",
							"h": "⒣#hｈℎⓗℍℌℋₕħʜɦⱨɧℜηⲏнԋһհክዘዪꮋꮒᕼんꓧ卄𝐇",
							"i": "!¡⑴⒤*׀⇂|∣⍳❕❗⥜1１❶①⓵¹₁iｉⅰⅈℹⓘℐℑⁱıɪᶦᴉɩjlｌⅼℓǀιⲓіꙇӏוןاﺎﺍߊⵏꭵᛁꓲ-",
							"j": "⒥ℑjｊⅉⓙⱼᴊʝɟʄϳјյꭻᒍᒚꓙ𝐉",
							"k": "⒦₭kｋⓚₖᴋƙʞκⲕкӄҟҝꮶᛕꓗ𝐊",
							"l": "⒧׀|∣1iｉⅰℐℑɩlｌⅼℓⓛℒₗʟⱡɭɮꞁǀιⲓⳑіӏוןاﺎﺍߊⵏꮭꮮᒪᛁﾚㄥꓡꓲ",
							"m": "⒨♍₥๓mｍⅿⓜℳₘᴍɱꭑʍμϻⲙмጠꮇᗰᘻᛖﾶꓟ爪𝐌",
							"n": "⒩♑₦nｎⓝℕⁿₙɴᴎɲɳŋηνⲛђипղոռሸꮑᑎᘉꓠ刀𝐍",
							"o": "⒪*°⊘⍥○⭕¤၀๐໐߀〇০୦0०੦૦௦౦೦൦０⓪⓿⁰₀٥۵oｏℴⓞºₒᴏᴑꬽθοσⲟофჿօסⵔዐዕଠഠဝꓳ-",
							"p": "⒫⍴pｐⓟℙₚᴘρϱⲣрየꮲᑭꓑ𝐏",
							"q": "⒬۹9oqｑⓠℚϙϱԛфգզⵕᑫ𝐐",
							"r": "⒭rｒⓡℝℛℜʀɾꭇꭈᴦⲅгհዪꭱꮁꮢꮧᖇꓣ乃几卂尺𝐑",
							"s": "⒮§$₴5sｓⓢₛꜱʂƽςѕꙅտֆꭶꮥꮪᔆᔕꓢ丂𝐒",
							"t": "⒯⊤⟙ℑtｔⓣₜᴛŧƫƭτⲧтፕꭲꮏｷꓔ千",
							"u": "⒰*∪⋃uｕⓤꞟᴜꭎꭒɥvʋυսሀሁᑌꓴ𝐔-",
							"v": "⒱℣√∨⋁☑✅✔✔️۷٧uvｖⅴⓥⱽᴠνѵⴸꮙꮩᐯᐺꓦ𝐕",
							"w": "⒲ɯwｗⓦᴡʍѡԝաሠꮃꮤꓪ",
							"x": "᙮⒳᙭×⌧╳⤫⤬⨯xｘⅹⓧₓꭓχⲭжхӽӿҳאⵝᕁᕽᚷﾒꓫ乂𝐗",
							"y": "⒴५ɣvᶌyｙⓨʏỿꭚγℽυϒⲩуүყሃꭹꮍꓬ𝐘*-",
							"z": "⒵zｚⓩℤℨᶻᴢƶȥʐʑⱬƹƨζչꮓᙆえꓜ乙𝐙",
						}[letter] || ""
					}]`,
			),
		)
		.join("|");
}

export const badWordRegexps = badWords.map(
	([strings = [], words = [], prefixes = []]) =>
		new RegExp(
			(strings.length ? `${decodeRegexps(strings)}|` : "(?!x)x") +
				`\\b(?:${words.length ? `(?:${decodeRegexps(words)})\\b` : "(?!x)x"}${
					prefixes.length ? `|${decodeRegexps(prefixes)}` : "(?!x)x"
				})`,
			"gi",
		),
);

export default function censor(text: string, strikeShift = 0) {
	const words: string[][] = [];
	const censored = badWordRegexps.reduce((string, regexp, index) => {
		words[index] ??= [];

		return string.replaceAll(regexp, (word) => {
			words[index]?.push(word);

			return word.length < 3
				? "#".repeat(word.length)
				: word[0] + "#".repeat(word.length - 1);
		});
	}, normalize(text));

	return words.flat().length
		? {
				censored,

				strikes: words.reduce(
					(accumulator, current, index) =>
						current.length * Math.max(index - strikeShift, PARTIAL_STRIKE_COUNT) +
						accumulator,
					0,
				),

				words,
		  }
		: false;
}

export function badWordsAllowed(channel?: TextBasedChannel | null) {
	const baseChannel = getBaseChannel(channel);

	return (
		baseChannel?.type === ChannelType.DM ||
		channel?.type === ChannelType.PrivateThread ||
		!baseChannel?.permissionsFor(baseChannel.guild.id)?.has(PermissionFlagsBits.ViewChannel)
	);
}
