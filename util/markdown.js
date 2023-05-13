import { escapeMarkdown, escapeMaskedLink, hyperlink } from "discord.js";

/**
 * Escape text.
 *
 * @deprecated Djs has this.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function escapeMessage(text) {
	return escapeMarkdown(text, { maskedLink: true });
}

/**
 * Strip all markdown from a string.
 *
 * @param {string} text - String to strip.
 *
 * @returns {string} - Stripped string.
 */
export function stripMarkdown(text) {
	return text.replaceAll(
		/(?<!\\)\\|```\S*\s+(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
		"$1$2$3$4$5$6$7$8",
	);
}

/**
 * Generate a Markdown tooltip.
 *
 * @param {import("discord.js").TextBasedChannel} channel - The channel the tooltip will be sent in.
 * @param {string} display - The displayed text.
 * @param {string | undefined} tooltipText - The tooltip text.
 *
 * @returns {string} - The link.
 */
export function generateTooltip(channel, display, tooltipText) {
	return tooltipText
		? hyperlink(escapeMaskedLink(display), channel?.url || "", tooltipText)
		: escapeMaskedLink(display);
}
