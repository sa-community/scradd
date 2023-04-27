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
export function joinWithAnd<Item extends { toString: () => string }>(
	array: Item[],
	callback?: ((item: Item) => string) | undefined,
): string;
export function joinWithAnd<Item>(array: Item[], callback: (item: Item) => string): string;
export function joinWithAnd(array: any[], callback = (item: any) => item.toString()): string {
	const last = array.pop();

	if (last === undefined) return "";

	if (array.length === 0) return callback(last);

	return `${
		array.length === 1
			? `${array[0] ? callback(array[0]) : ""} `
			: array.map((item) => `${callback(item)}, `).join("")
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
export function truncateText(text: string, maxLength: number): string {
	const noWhitespace = text.replaceAll(/\s+/g, " ");
	const segments = Array.from(
		new Intl.Segmenter().segment(noWhitespace),
		({ segment }) => segment,
	);

	return segments.length > maxLength || text.includes("\n")
		? `${segments.slice(0, Math.max(0, maxLength - 1)).join("")}…`
		: segments.join("");
}

/**
 * Encodes text using the Caeser Chiper.
 *
 * @param text - The text to encode.
 * @param rot - The rotate shift.
 *
 * @returns The encoded text.
 */
export function caesar(text: string, rot = 13) {
	return text.replace(/[a-z]/gi, (chr) => {
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
		.replace(
			/[\p{Diacritic}\u00AD\u0300-\u036f\u0489\u061C\u070F\u17B4\u17B5\u180E\u200A-\u200F\u2060-\u2064\u206A-\u206F]/gu,
			"",
		);
}

/**
 * Trims the patch version off of a Semver.
 *
 * @param full - The full version.
 *
 * @returns The patchless version.
 */
export function trimPatchVersion(full: string): string {
	return full.match(/^(?<main>\d+\.\d+)\.\d+/)?.groups?.main ?? full;
}
