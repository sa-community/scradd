import { type MessageCreateOptions, time, TimestampStyles } from "discord.js";
import { client } from "../../lib/client.js";
import config from "../../common/config.js";
import { nth } from "../../util/numbers.js";
import { remindersDatabase, SpecialReminders } from "../reminders.js";
import { getSettings } from "../settings.js";
import { getFullWeeklyData, recentXpDatabase, xpDatabase } from "./misc.js";
import constants from "../../common/constants.js";

export async function getChatters() {
	const weeklyWinners = getFullWeeklyData();
	const winner = weeklyWinners[0]?.user;
	weeklyWinners.splice(
		0,
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1,
	);
	if (!weeklyWinners.length) return;

	const formatted = await Promise.all(
		weeklyWinners.map(
			async (user) =>
				`${weeklyWinners.findIndex((found) => found.xp === user.xp) + 6}) ${
					(
						await client.users.fetch(user.user)
					).displayName
				} - ${Math.floor(user.xp).toLocaleString("en-us")} XP`,
		),
	);

	while (formatted.join("\n").length > 4096) formatted.pop();
	const ending =
		weeklyWinners[formatted.length] &&
		` ${weeklyWinners[formatted.length]?.xp.toLocaleString("en-us")} XP`;
	const filtered = ending ? formatted.filter((line) => !line.endsWith(ending)) : formatted;

	return {
		embeds: [
			{
				description: "```\n" + filtered.join("\n").replaceAll("```", "'''") + "\n```",
				footer: ending
					? {
							icon_url: config.guild.iconURL() ?? undefined,
							text: `${
								weeklyWinners.length - filtered.length
							} more users with <=${ending}`,
					  }
					: undefined,
				color: constants.themeColor,
				thumbnail: winner
					? {
							url: (
								await config.guild.members
									.fetch(winner)
									.catch(() => client.users.fetch(winner))
							).displayAvatarURL(),
					  }
					: undefined,
			},
		],
	} satisfies MessageCreateOptions;
}

export default async function getWeekly(nextWeeklyDate: Date) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: config.channels.announcements?.id || "",
			date: Number(nextWeeklyDate),
			reminder: undefined,
			id: SpecialReminders.Weekly,
			user: client.user.id,
		},
	];
	const weeklyWinners = getFullWeeklyData();
	recentXpDatabase.data = recentXpDatabase.data.filter(
		({ time }) => time + 604_800_000 > Date.now(),
	);

	const { active } = config.roles;
	const activeMembers = weeklyWinners.filter((item) => item.xp > 350);
	if (active) {
		await Promise.all([
			...active.members.map(async (roleMember) => {
				if (!activeMembers.some((item) => item.user === roleMember.id))
					return await roleMember.roles.remove(active, "Inactive");
			}),
			...activeMembers.map(
				async ({ user: memberId }) =>
					await config.guild.members
						.fetch(memberId)
						.catch(() => {})
						.then((activeMember) => activeMember?.roles.add(active, "Active")),
			),
		]);
	}

	const date = new Date();
	date.setUTCDate(date.getUTCDate() - 7);
	const chatters = weeklyWinners.length;
	const allXp = Math.floor(weeklyWinners.reduce((one, two) => one + two.xp, 0));

	weeklyWinners.splice(
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1,
	);
	const ids = weeklyWinners.map((gain) => gain.user);

	const role = config.roles.weekly_winner;
	if (role) {
		await Promise.all([
			...role.members.map(async (weeklyMember) => {
				if (!ids.includes(weeklyMember.id))
					return await weeklyMember.roles.remove(role, `No longer weekly winner`);
			}),
			...weeklyWinners.map(
				async ({ user: userId }, index) =>
					await config.guild.members
						.fetch(userId)
						.catch(() => {})
						.then((member) =>
							member?.roles.add(
								index || !config.roles.epic ? role : [role, config.roles.epic],
								`Weekly winner`,
							),
						),
			),
		]);
	}

	return {
		allowedMentions: { users: ids.filter((id) => getSettings({ id }).weeklyPings) },

		content: `__**🏆 Weekly Winners week of ${
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
		} ${nth(date.getUTCDate(), {
			bold: false,
			jokes: false,
		})}**__\n${
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
		)} people chatted, and ${activeMembers.length.toLocaleString(
			"en-us",
		)} people were active. Altogether, people gained ${allXp.toLocaleString(
			"en-us",
		)} XP this week.*\n__Next week’s weekly winners will be posted ${time(
			nextWeeklyDate,
			TimestampStyles.RelativeTime,
		)}.__`,
	} satisfies MessageCreateOptions;
}
