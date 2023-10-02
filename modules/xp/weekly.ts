import {
	type MessageCreateOptions,
	time,
	TimestampStyles,
	type Snowflake,
	userMention,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { nth } from "../../util/numbers.js";
import { remindersDatabase, SpecialReminders } from "../reminders/misc.js";
import { getFullWeeklyData, recentXpDatabase, xpDatabase } from "./misc.js";
import constants from "../../common/constants.js";
import { recheckMemberRole } from "../roles/custom.js";

export async function getChatters() {
	const weeklyWinners = getFullWeeklyData();
	const winnerId = weeklyWinners[0]?.user;
	const winner =
		winnerId &&
		(await config.guild.members
			.fetch(winnerId)
			.catch(() => client.users.fetch(winnerId).catch(() => void 0)));
	weeklyWinners.splice(
		0,
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1 || weeklyWinners.length,
	);
	if (!weeklyWinners.length) return;

	const formatted = weeklyWinners.map(
		(user) =>
			`${weeklyWinners.findIndex((found) => found.xp === user.xp) + 6}) ${userMention(
				user.user,
			)} - ${Math.floor(user.xp).toLocaleString("en-us")} XP`,
	);

	while (formatted.join("\n").length > 4096) formatted.pop();
	const ending =
		weeklyWinners[formatted.length] &&
		` ${weeklyWinners[formatted.length]?.xp.toLocaleString("en-us")} XP`;
	const filtered = ending ? formatted.filter((line) => !line.endsWith(ending)) : formatted;

	return {
		embeds: [
			{
				description: filtered.join("\n"),
				footer: ending
					? {
							icon_url: config.guild.iconURL() ?? undefined,
							text: `${
								weeklyWinners.length - filtered.length
							} more users with <=${ending}`,
					  }
					: undefined,
				color: constants.themeColor,
				thumbnail: winner ? { url: winner.displayAvatarURL() } : undefined,
			},
		],
	} satisfies MessageCreateOptions;
}

export default async function getWeekly(nextWeeklyDate: Date) {
	if (config.channels.announcements) {
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: config.channels.announcements.id,
				date: Number(nextWeeklyDate),
				reminder: undefined,
				id: SpecialReminders.Weekly,
				user: client.user.id,
			},
		];
	}

	const weeklyWinners = getFullWeeklyData();

	const latestActiveMembers = weeklyWinners.filter((item) => item.xp >= 300);
	const activeMembers = [
		...latestActiveMembers,
		...Object.entries(
			recentXpDatabase.data.reduce<Record<Snowflake, number>>((accumulator, gain) => {
				accumulator[gain.user] = (accumulator[gain.user] ?? 0) + gain.xp;
				return accumulator;
			}, {}),
		)
			.map((entry) => ({ xp: entry[1], user: entry[0] }))
			.filter((item) => item.xp >= 500),
	];

	const activeRole = config.roles.active;
	if (activeRole) {
		await Promise.all([
			...activeRole.members.map(async (roleMember) => {
				if (!activeMembers.some((item) => item.user === roleMember.id))
					return await roleMember.roles.remove(activeRole, "Inactive");
			}),
			...activeMembers.map(
				async ({ user: memberId }) =>
					await config.guild.members
						.fetch(memberId)
						.catch(() => void 0)
						.then((activeMember) => activeMember?.roles.add(activeRole, "Active")),
			),
		]);
	}

	recentXpDatabase.data = recentXpDatabase.data.filter(
		({ time }) => time + 604_800_000 > Date.now(),
	);

	const date = new Date();
	date.setUTCDate(date.getUTCDate() - 7);
	const chatters = weeklyWinners.length;
	const allXp = Math.floor(weeklyWinners.reduce((one, two) => one + two.xp, 0));

	weeklyWinners.splice(
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1 || weeklyWinners.length,
	);
	const ids = new Set(weeklyWinners.map((gain) => gain.user));

	const role = config.roles.weekly_winner;
	if (role) {
		await Promise.all([
			...role.members.map(async (weeklyMember) => {
				if (!ids.has(weeklyMember.id))
					return await weeklyMember.roles.remove(role, "No longer weekly winner");
			}),
			...weeklyWinners.map(
				async ({ user: userId }, index) =>
					await config.guild.members
						.fetch(userId)
						.catch(() => void 0)
						.then((member) =>
							member?.roles.add(
								index || !config.roles.epic ? role : [role, config.roles.epic],
								"Weekly winner",
							),
						),
			),
		]);
	}

	await Promise.all(
		weeklyWinners.map(async (weeklyWinner) => {
			const member = await config.guild.members.fetch(weeklyWinner.user).catch(() => void 0);
			if (member) await recheckMemberRole(member, member);
		}),
	);

	return `__**🏆 Weekly Winners week of ${
		[
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		][date.getUTCMonth()] || ""
	} ${nth(date.getUTCDate())}**__\n${
		weeklyWinners
			.map(
				(gain, index) =>
					`${["🥇", "🥈", "🥉"][index] || "🏅"} <@${gain.user}> - ${Math.floor(
						gain.xp *
							Math.sign(
								xpDatabase.data.find(({ user }) => user === gain.user)?.xp || 1,
							),
					).toLocaleString("en-us")} XP`,
			)
			.join("\n") || "*Nobody got any XP this week!*"
	}\n\n*This week, ${chatters.toLocaleString(
		"en-us",
	)} people chatted, and ${latestActiveMembers.length.toLocaleString(
		"en-us",
	)} people were active. Altogether, people gained ${allXp.toLocaleString(
		"en-us",
	)} XP this week.*\n__Next week’s weekly winners will be posted ${time(
		nextWeeklyDate,
		TimestampStyles.RelativeTime,
	)}.__`;
}
