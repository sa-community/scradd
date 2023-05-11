import CONSTANTS from "../../common/CONSTANTS.js";
import log from "./logging.js";

import type Event from "../../common/types/event";

defineEvent("webhookUpdate", async (channel) => {
	if (channel.guild.id !== CONSTANTS.guild.id) return;

	await log(`🌐 Webhooks updated in ${channel.toString()}!`, "channels");
});
