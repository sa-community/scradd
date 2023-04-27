import { time } from "discord.js";

import changeNickname from "../automod/nicknames.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "./logging.js";

import type Event from "../../common/types/event";

const event: Event<"guildMemberUpdate"> = async function event(oldMember, newMember) {
	if (newMember.guild.id !== CONSTANTS.guild.id) return;
	const logs = [];
	if (oldMember.avatar !== newMember.avatar) {
		const avatarURL = newMember.avatarURL({ size: 128, forceStatic: false });
		const response = avatarURL && (await fetch(avatarURL));
		await log(
			`🫂 Member ${newMember.toString()} ${
				response ? "changed" : "removed"
			} their server avatar!`,
			"members",
			{ files: response ? [Buffer.from(await response.arrayBuffer())] : [] },
		);
	}

	if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
		if (
			newMember.communicationDisabledUntil &&
			Number(newMember.communicationDisabledUntil) > Date.now()
		)
			logs.push(` timed out until ${time(newMember.communicationDisabledUntil)}`);
		else if (
			oldMember.communicationDisabledUntil &&
			Number(oldMember.communicationDisabledUntil) > Date.now()
		)
			logs.push("’s timeout was removed");
	}
	if (oldMember.nickname !== newMember.nickname) {
		logs.push(
			newMember.nickname ? ` was nicknamed ${newMember.nickname}` : "’s nickname was removed",
		);
		await changeNickname(newMember);
	}
	if (newMember.roles.premiumSubscriberRole && CONSTANTS.roles.booster)
		await newMember.roles.add(CONSTANTS.roles.booster, "Boosted the server");

	await Promise.all(
		logs.map(async (edit) => await log(`🫂 Member ${newMember.toString()}${edit}!`, "members")),
	);
};
export default event;
