import { ChannelType } from "discord.js";

import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("channelCreate", async (channel) => {
	if (channel.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`📃 ${
			{
				[ChannelType.GuildText]: "Text",
				[ChannelType.GuildVoice]: "Voice",
				[ChannelType.GuildCategory]: "Category",
				[ChannelType.GuildAnnouncement]: "Announcement",
				[ChannelType.GuildStageVoice]: "Stage",
				[ChannelType.GuildForum]: "Forum",
			}[channel.type]
		} channel ${channel.toString()} (${channel.name}) created${
			channel.parent ? ` under ${channel.parent}` : ""
		}!`,
		"channels",
	);
});
