import type { Snowflake } from "discord.js";
import Database from "../../common/database.js";

export const xpDatabase = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** How much XP they have. */
	xp: number;
}>("xp");
export const weeklyXpDatabase = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** How much XP they gained. */
	xp: number;
}>("recent_xp");

await xpDatabase.init();
await weeklyXpDatabase.init();

export const DEFAULT_XP = 5;

const XP_PER_LEVEL = [
	0, 50, 100, 300, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8500, 10_000,
	11_500, 13_000, 15_000, 17_000, 19_000, 21_000, 23_000, 25_000, 28_000, 31_000, 34_000, 37_000,
	40_000, 43_000, 46_000, 49_000, 53_000, 57_000, 61_000, 65_000, 69_000, 73_000, 77_000, 81_000,
	85_000, 90_000, 95_000, 100_000, 105_000, 110_000, 115_000, 122_500, 130_000, 137_500, 145_000,
	152_500, 160_000, 170_000, 180_000, 190_000, 200_000, 210_000, 220_000, 230_000, 240_000,
	250_000, 261_500, 273_000, 284_500, 296_000, 307_500, 319_000, 330_500, 342_069, 354_000,
	365_000, 376_000, 387_000, 400_000, 413_000, 426_000, 440_000, 455_000, 470_000, 485_000,
	500_000, 515_000, 530_000, 545_000, 560_000, 575_000, 590_000,
];

const INCREMENT_FREQUENCY = 10;

/**
 * Get the difference between the XP required for a level and its predecessor.
 *
 * @param level - The level to get the increment for.
 *
 * @returns The increment.
 */
function getIncrementForLevel(level: number): number {
	const xpForLevel = XP_PER_LEVEL[level];
	const xpForPreviousLevel = XP_PER_LEVEL[level - 1];

	if (xpForLevel !== undefined && xpForPreviousLevel !== undefined)
		return xpForLevel - xpForPreviousLevel;

	if (level % INCREMENT_FREQUENCY === 0) {
		const number = (level - XP_PER_LEVEL.length) / INCREMENT_FREQUENCY + 3;

		// Credit to idkhow2type (and Jazza 😉) on the SA Discord for the following line
		return ((number % 9) + 1) * 10 ** Math.floor(number / 9) * 5000;
	}

	return getIncrementForLevel(Math.floor(level / INCREMENT_FREQUENCY) * INCREMENT_FREQUENCY);
}

/**
 * Get the needed amount of XP to reach the given level.
 *
 * @param level - The level.
 *
 * @returns The needed XP.
 */
export function getXpForLevel(level: number): number {
	const xpForLevel = XP_PER_LEVEL[level];

	if (xpForLevel !== undefined) return xpForLevel;

	return getXpForLevel(level - 1) + getIncrementForLevel(level);
}

/**
 * Get the corresponding level of an XP value.
 *
 * @param xp - The XP value.
 *
 * @returns The corresponding level.
 */
export function getLevelForXp(xp: number): number {
	const foundLevel = XP_PER_LEVEL.findIndex((found) => found > xp) - 1;

	if (foundLevel !== -2) return foundLevel;

	// eslint-disable-next-line fp/no-let -- We need to use let here.
	let level = XP_PER_LEVEL.length;

	while (getXpForLevel(level) < xp) level++;

	return level;
}
