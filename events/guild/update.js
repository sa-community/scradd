import {
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	GuildMFALevel,
	GuildNSFWLevel,
	GuildVerificationLevel,
} from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"guildUpdate">} */
const event = {
	async event(oldGuild, newGuild) {
		if (newGuild.id !== process.env.GUILD_ID) return;

		const logs = [];
		if (oldGuild.afkChannel?.id !== newGuild.afkChannel?.id) {
			logs.push(
				`Inactive channel ${
					newGuild.afkChannel ? `set to ${newGuild.afkChannel?.toString()}` : "removed"
				}`,
			);
		}
		if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
			logs.push(`Inactive timeout set to ${newGuild.afkTimeout}`);
		}
		if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
			logs.push(
				`Server banner background ${
					newGuild.bannerURL() ? `set to <${newGuild.bannerURL()}>` : newGuild.nameAcronym
				}`,
			);
		}
		if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
			logs.push(
				`Default notification settings set to "${
					{
						[GuildDefaultMessageNotifications.AllMessages]: "All messages",
						[GuildDefaultMessageNotifications.OnlyMentions]: "Only @mentions",
					}[newGuild.defaultMessageNotifications]
				}"`,
			);
		}
		if (oldGuild.description !== newGuild.description) {
			logs.push(`Server description set to ${newGuild.description}`);
		}
		if (oldGuild.discoverySplashURL() !== newGuild.discoverySplashURL()) {
			logs.push(
				`Server discovery splash image ${
					newGuild.discoverySplashURL()
						? `set to <${newGuild.discoverySplashURL()}>`
						: "removed"
				}`,
			);
		}
		if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
			logs.push(
				`Explicit media content filter set to "${
					{
						[GuildExplicitContentFilter.Disabled]: "Don't scan any media content.",
						[GuildExplicitContentFilter.MembersWithoutRoles]:
							"Scan media content from members without a role.",
						[GuildExplicitContentFilter.AllMembers]:
							"Scan media content from all members.",
					}[newGuild.explicitContentFilter]
				}"`,
			);
		}
		if (oldGuild.features.includes("FEATURABLE") !== newGuild.features.includes("FEATURABLE")) {
			logs.push(
				`Server ${
					newGuild.features.includes("FEATURABLE") ? "" : "un"
				}featured on Server Discovery`,
			);
		}
		if (
			oldGuild.features.includes("MONETIZATION_ENABLED") !==
			newGuild.features.includes("MONETIZATION_ENABLED")
		) {
			logs.push(
				`Monetization ${
					newGuild.features.includes("MONETIZATION_ENABLED") ? "en" : "dis"
				}abled`,
			);
		}
		if (
			oldGuild.features.includes("WELCOME_SCREEN_ENABLED") !==
			newGuild.features.includes("WELCOME_SCREEN_ENABLED")
		) {
			logs.push(
				`Welcome Screen ${
					newGuild.features.includes("WELCOME_SCREEN_ENABLED") ? "en" : "dis"
				}abled`,
			);
		}
		if (oldGuild.iconURL() !== newGuild.iconURL()) {
			logs.push(
				`Server icon ${newGuild.iconURL() ? `set to <${newGuild.iconURL()}>` : "removed"}`,
			);
		}
		if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
			logs.push(
				`2FA requirement for moderation ${
					{ [GuildMFALevel.None]: "dis", [GuildMFALevel.Elevated]: "en" }[
						newGuild.mfaLevel
					]
				}abled`,
			);
		}
		if (oldGuild.name !== newGuild.name) {
			logs.push(`Server name set to ${newGuild.name}`);
		}
		if (oldGuild.nsfwLevel !== newGuild.nsfwLevel) {
			logs.push(
				"Server " +
					(newGuild.nsfwLevel === GuildNSFWLevel.Default
						? "unmarked as NSFW"
						: `marked as ${
								{
									[GuildNSFWLevel.Explicit]: "18+",
									[GuildNSFWLevel.Safe]: "safe",
									[GuildNSFWLevel.AgeRestricted]: "13+",
								}[newGuild.nsfwLevel]
						  }`),
			);
		}
		if (oldGuild.ownerId !== newGuild.ownerId) {
			logs.push(`Server transferred to <@${newGuild.ownerId}>`);
		}
		if (oldGuild.partnered !== newGuild.partnered) {
			logs.push(`Server ${newGuild.partnered ? "" : "un"}partnered`);
		}
		if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
			logs.push(`Server primary language switched to ${newGuild.preferredLocale}`);
		}
		if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
			logs.push(
				`Boost progress bar ${newGuild.premiumProgressBarEnabled ? "shown" : "hidden"}`,
			);
		}
		if (oldGuild.publicUpdatesChannel?.id !== newGuild.publicUpdatesChannel?.id) {
			logs.push(
				"Community updates channel " +
					(newGuild.publicUpdatesChannel
						? "set to " + newGuild.publicUpdatesChannel.toString()
						: "unset"),
			);
		}
		if (oldGuild.rulesChannel?.id !== newGuild.rulesChannel?.id) {
			logs.push(
				"Rules or guidelines channel " +
					(newGuild.rulesChannel
						? "set to " + newGuild.rulesChannel.toString()
						: "unset"),
			);
		}
		if (oldGuild.splashURL() !== newGuild.splashURL()) {
			logs.push(
				`Server invite background ${
					newGuild.splashURL() ? `set to <${newGuild.splashURL()}>` : "removed"
				}`,
			);
		}
		if (oldGuild.systemChannel !== newGuild.systemChannel) {
			logs.push(
				"System updates channel " +
					(newGuild.systemChannel
						? "set to " + newGuild.systemChannel.toString()
						: "unset"),
			);
		}
		if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
			logs.push(`Custom invite link set to ${newGuild.vanityURLCode}`);
		}
		if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
			logs.push(
				`Verification level set to "${
					{
						[GuildVerificationLevel.None]: "Unrestricted",
						[GuildVerificationLevel.Low]:
							"Must have a verified email on their Discord account.",
						[GuildVerificationLevel.Medium]:
							"Must also be registered on Discord for longer than 5 minutes.",
						[GuildVerificationLevel.High]:
							"Must also be a member of this server for longer than 10 minutes.",
						[GuildVerificationLevel.VeryHigh]:
							"Must have a verified phone on their Discord account.",
					}[newGuild.verificationLevel]
				}"`,
			);
		}
		if (oldGuild.verified !== newGuild.verified) {
			logs.push(`Server ${newGuild.partnered ? "" : "un"}verified`);
		}
		if (oldGuild.widgetChannel?.id !== newGuild.widgetChannel?.id) {
			logs.push(
				`Server widget invite channel ${
					newGuild.widgetChannel ? "set to " + newGuild.widgetChannel.toString() : "unset"
				}`,
			);
		}
		if (oldGuild.widgetEnabled !== newGuild.widgetEnabled) {
			logs.push(`Server widget ${newGuild.partnered ? "en" : "dis"}abled`);
		}
		if (oldGuild.maxVideoChannelUsers !== newGuild.maxVideoChannelUsers) {
			logs.push(
				`The max number of users allowed in a video channel changed to ${newGuild.maxVideoChannelUsers}`,
			);
		}

		await Promise.all(logs.map((edit) => log(newGuild, edit + `!`, "server")));
	},
};

export default event;
