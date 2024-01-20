import type { IncomingMessage } from "node:http";

/**
 * Generate a short, random string based off the date. Note that the length is not fixed.
 *
 * Intended for use on `APIBaseComponent#customId`s.
 *
 * @deprecated Use `Interaction#id` instead.
 *
 * @param prefix - An optional prefix to the hash.
 *
 * @returns Hash.
 */
export function generateHash(prefix = ""): string {
	return `${prefix}.${Math.round(
		Math.random() * 100_000_000 + Date.now() - 1_643_000_000_000,
	).toString(36)}`;
}

/**
 * Joins an array using (Oxford) comma rules and the word "and".
 *
 * @param array - The array to join.
 * @param callback - A function to convert each item to a string.
 *
 * @returns The joined string.
 */
export function joinWithAnd<Item extends { toString(): string }>(
	array: Item[],
	callback?: ((item: Item) => string) | undefined,
): string;
export function joinWithAnd<Item>(array: Item[], callback: (item: Item) => string): string;
export function joinWithAnd(
	array: { toString(): string }[],
	callback = (item: { toString(): string }) => item.toString(),
): string {
	const last = array.at(-1);

	if (last === undefined) return "";

	if (array.length === 1) return callback(last);

	return `${
		array.length === 2
			? `${array[0] ? callback(array[0]) : ""} `
			: array
					.slice(0, -1)
					.map((item) => `${callback(item)}, `)
					.join("")
	}and ${callback(last)}`;
}

/**
 * Slice a string so that it fits into a given length.
 *
 * @param text - The string to truncate.
 * @param maxLength - The maximum length of the string.
 *
 * @returns The truncated string.
 */
export function truncateText(text: string, maxLength: number, multiline = false): string {
	text = text.replaceAll(/\n+/g, "\n").trim();
	const condensed = (!multiline && text.split("\n")[0]) || text;
	const trimmed = condensed.slice(0, maxLength);
	const segments = Array.from(new Intl.Segmenter().segment(trimmed), ({ segment }) => segment);

	if (trimmed.length > maxLength) segments.pop();
	const output = segments.join("").trim();
	return output === text
		? output
		: output.slice(0, output.length === maxLength ? -1 : undefined) + "…";
}

/**
 * Encodes text using the Caesar Cipher.
 *
 * @param text - The text to encode.
 * @param rot - The rotate shift.
 *
 * @returns The encoded text.
 */
export function caesar(text: string, rot = 13) {
	return text.replaceAll(/[a-z]/gi, (chr) => {
		const start = chr <= "Z" ? 65 : 97;

		return String.fromCodePoint(start + (((chr.codePointAt(0) ?? 0) - start + rot) % 26));
	});
}

/**
 * Normalize a string.
 *
 * @param text - The string to normalize.
 *
 * @returns The normalized string.
 */
export function normalize(text: string) {
	return text
		.normalize("NFD")
		.replaceAll(/[\p{Dia}\p{M}\p{Cf}\p{Sk}]+/gu, "")
		.replaceAll(/[\p{Zs}\t]+/gu, " ")
		.replaceAll(/[\p{Zl}\p{Zp}\r\n\f]+/gu, "\n");
}

/**
 * Trims the patch version off of a Semver.
 *
 * @param full - The full version.
 *
 * @returns The patchless version.
 */
export function trimPatchVersion(full: string): string {
	return /^(?<main>\d+\.\d+)\.\d+/.exec(full)?.groups?.main ?? full;
}

export function getRequestUrl(request: IncomingMessage) {
	return new URL(
		request.url ?? "",
		request.headers["x-forwarded-host"]
			? `${request.headers["x-forwarded-proto"]}://${request.headers["x-forwarded-host"]}`
			: `http${"encrypted" in request.socket ? "s" : ""}://${request.headers.host}`,
	);
}
