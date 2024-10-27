/* On production, this file is replaced with another file with the same structure. */

import type { Snowflake } from "discord.js";
import { client } from "strife.js";
import constants from "../../common/constants.js";

export const greetings = ["Hi"] as const;
export const customResponses: Record<string, string> = {};
export const customNames: Record<string, string> = {};
export const customComments: Record<string, string> = {};
export const customTriggers: readonly string[] = Object.keys({});
export const dadEasterEggCount =
	Object.keys(customResponses).length +
	Object.keys(customNames).length +
	Object.keys(customComments).length +
	customTriggers.length -
	// Dupes
	0 +
	// Dynamic
	0;

/**
 * - `word`
 * - `plural` (`true`)
 * - `partial` (`content.includes`)
 * - `raw` (`messsge.content`)
 * - `full` (`content ===`)
 * - `negative` - overrides all (`&& !content.includes`)
 * - `ping` - only direct pings (`message.mentions.has`)
 */
const autoreactions: [
	string[] | string,
	...(
		| RegExp
		| string
		| [RegExp | string, "full" | "negative" | "partial" | "plural" | "raw"]
		| [Snowflake, "ping"]
	)[],
][] = [
	//
	["👋", [constants.isTesting ? "0" : client.user.id, "ping"]],
];
export default autoreactions;
