import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import { Colors, FormattingPatterns, type ColorResolvable } from "discord.js";
import config from "../../common/config.js";

export const CUSTOM_ROLE_PREFIX = "✨ ";

const validContentTypes = ["image/jpeg", "image/png", "image/apng", "image/gif", "image/webp"];
/**
 * Valid strings: string matching twemojiRegexp, Snowflake of existing server emoji, data: URI, string starting with
 * https://
 */
export async function resolveIcon(
	icon: string,
): Promise<
	{ icon: string; unicodeEmoji: null } | { unicodeEmoji: string; icon: null } | undefined
> {
	// eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
	const twemoji = icon.match(twemojiRegexp.default);
	if (twemoji?.[0] === icon) return { unicodeEmoji: icon, icon: null };

	const serverEmoji = FormattingPatterns.Emoji.exec(icon);
	const id =
		(serverEmoji?.[0] === icon && serverEmoji.groups?.id) || (/^\d{17,20}$/.test(icon) && icon);
	const url = id && config.guild.emojis.resolve(id)?.url;
	if (url) return { icon: url, unicodeEmoji: null };

	if (validContentTypes.some((contentType) => icon.startsWith(`data:${contentType};`)))
		return { icon, unicodeEmoji: null };

	if (!/^https?:\/\//.test(icon) || !URL.canParse(icon)) return;

	const response = await fetch(icon, { method: "HEAD" });
	if (!response.ok) return;

	const contentLength = +(response.headers.get("Content-Length") ?? Number.POSITIVE_INFINITY);
	if (contentLength > 256_000) return;

	const contentType = response.headers.get("Content-Type");
	if (!contentType || !validContentTypes.includes(contentType)) return;

	return { icon, unicodeEmoji: null };
}

export const COLORS = Object.fromEntries(
	([...Object.keys(Colors), "Random"] as const).flatMap((color) => [
		[color.toLowerCase(), color],
		[color.replaceAll(/(?<!^)([A-Z])/g, " $1").toLowerCase(), color],
	]),
);
export function parseColor(
	rawColor: string | undefined,
): Extract<ColorResolvable, string> | undefined {
	if (!rawColor) return undefined;

	const preset = COLORS[rawColor.toLowerCase()];
	if (preset) return preset;

	const color = (rawColor.startsWith("#") ? rawColor : (`#${rawColor}` as const)).toLowerCase();
	if (!/^#([\da-f]{6}|[\da-f]{3})$/i.test(color)) return undefined;

	return color.length === 4 ?
			`#${color[1] ?? ""}${color.slice(1, 3)}${color.slice(2, 4)}${color[3] ?? ""}`
		:	color;
}
