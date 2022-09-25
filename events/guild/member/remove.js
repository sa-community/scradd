import { guild } from "../../../client.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/moderation/logging.js";
import { closeModmail, getThreadFromMember } from "../../../common/modmail.js";

/** @type {import("../../../common/types/event").default<"guildMemberAdd">} */
export default async function event(member) {
	if (member.guild.id !== process.env.GUILD_ID) return;
	await log(`💨 Member ${member.toString()} left!`, "members");

	const byes = [
		`Welp… **${member.user.username}** decided to leave… what a shame…`,
		`Ahh… **${member.user.username}** left us… hope they’ll have safe travels!`,
		`There goes another, bye **${member.user.username}**!`,
		`Oop, **${member.user.username}** left… will they ever come back?`,
		`Can we get an F in the chat for **${member.user.username}**? They left!`,
		`Ope, **${member.user.username}** got eaten by an evil kumquat and left!`,
	];

	const banned = await guild.bans
		.fetch(member)
		.then((partialBan) => {
			if (partialBan.partial) return partialBan.fetch();
			return partialBan;
		})
		.catch(() => {});

	const bans = [
		`Oof… **${member.user.username}** got banned…`,
		`There’s no turning back for **${member.user.username}**…`,
		`I don't think this was the best place for **${member.user.username}**…`,
		`Oop, **${member.user.username}** angered the mods!`,
		`**${member.user.username}** broke the rules and took an L`,
		`**${member.user.username}** was banned ~~(he talked about opacity slider too much)~~`,
	];

	const promises = [
		CONSTANTS.channels.airport?.send(
			(banned
				? bans[Math.floor(Math.random() * bans.length)]
				: byes[Math.floor(Math.random() * byes.length)]) || "",
		),
		getThreadFromMember(member).then(async (thread) => {
			if (thread) closeModmail(thread, member.user, "Member left");
		}),
	];

	await Promise.all(promises);
}
