import {
	ApplicationRoleConnectionMetadataType,
	OAuth2Scopes,
	Routes,
	userMention,
	type RESTGetAPICurrentUserResult,
	type RESTPostOAuth2AccessTokenResult,
	type RESTPostOAuth2AccessTokenURLEncodedData,
	type RESTPostOAuth2RefreshTokenResult,
	type RESTPostOAuth2RefreshTokenURLEncodedData,
	type RESTPutAPICurrentUserApplicationRoleConnectionJSONBody,
	type RESTPutAPICurrentUserApplicationRoleConnectionResult,
} from "discord.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { fetchUser } from "../../util/scratch.js";
import { getRequestUrl } from "../../util/text.js";
import { handleUser } from "../autos/scratch.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

await client.application.editRoleConnectionMetadataRecords([
	{
		key: "joined",
		name: "Joined",
		description: "Days since joining Scratch",
		type: ApplicationRoleConnectionMetadataType.DatetimeGreaterThanOrEqual,
	},
]);

export default async function linkScratchRole(
	request: IncomingMessage,
	response: ServerResponse,
): Promise<ServerResponse> {
	if (!process.env.CLIENT_SECRET)
		return response.writeHead(501, { "content-type": "text/plain" }).end("501 Not Implemented");
	if (request.method === "OPTIONS")
		return response.writeHead(201, { "content-type": "text/plain" }).end("201 No Content");

	const requestUrl = getRequestUrl(request);
	const redirectUri = requestUrl.origin + requestUrl.pathname;
	const discordUrl = `https://discord.com${Routes.oauth2Authorization()}?${new URLSearchParams({
		client_id: client.user.id,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: OAuth2Scopes.Identify + " " + OAuth2Scopes.RoleConnectionsWrite,
	}).toString()}`;
	const discordHtml = `<meta http-equiv="refresh" content="0;url=${discordUrl}">`; // eslint-disable-line unicorn/string-content

	const search = new URLSearchParams(requestUrl.search);
	const scratchToken = search.get("privateCode");
	if (!scratchToken) {
		const code = search.get("code");
		if (!code) return response.writeHead(303, { location: discordUrl }).end();

		const tokenData = (await client.rest
			.post(Routes.oauth2TokenExchange(), {
				body: new URLSearchParams({
					redirect_uri: redirectUri,
					client_id: client.user.id,
					client_secret: process.env.CLIENT_SECRET,
					grant_type: "authorization_code",
					code,
				} satisfies RESTPostOAuth2AccessTokenURLEncodedData),
				passThroughBody: true,
				headers: { "content-type": "application/x-www-form-urlencoded" },
				auth: false,
			})
			.catch(() => void 0)) as RESTPostOAuth2AccessTokenResult | undefined;
		if (!tokenData)
			return response.writeHead(401, { "content-type": "text/html" }).end(discordHtml);

		return response.writeHead(303, { location: getScratchUrl(tokenData.refresh_token) }).end();
	}

	const rawToken = search.get("refresh_token");
	const discordToken = rawToken && decodeString(rawToken);
	if (!discordToken)
		return response.writeHead(401, { "content-type": "text/html" }).end(discordHtml);
	const tokenData = (await client.rest
		.post(Routes.oauth2TokenExchange(), {
			body: new URLSearchParams({
				client_id: client.user.id,
				client_secret: process.env.CLIENT_SECRET,
				grant_type: "refresh_token",
				refresh_token: discordToken,
			} satisfies RESTPostOAuth2RefreshTokenURLEncodedData),
			passThroughBody: true,
			headers: { "content-type": "application/x-www-form-urlencoded" },
			auth: false,
		})
		.catch(() => void 0)) as RESTPostOAuth2RefreshTokenResult | undefined;
	if (!tokenData)
		return response.writeHead(401, { "content-type": "text/html" }).end(discordHtml);

	const { username } = await fetch(
		`https://auth-api.itinerary.eu.org/auth/verifyToken/${encodeURI(scratchToken)}`,
	).then((verification) => verification.json() as Promise<{ username: string | null }>);
	const scratch = username && (await fetchUser(username));
	if (!scratch)
		return response.writeHead(401, { "content-type": "text/html" }).end(
			`<meta http-equiv="refresh" content="0;url=${getScratchUrl(tokenData.refresh_token)}">`, // eslint-disable-line unicorn/string-content
		);

	(await client.rest.put(Routes.userApplicationRoleConnection(client.user.id), {
		body: JSON.stringify({
			platform_name: "Scratch",
			platform_username: username,
			metadata: { joined: scratch.history.joined.split("T")[0] },
		} satisfies RESTPutAPICurrentUserApplicationRoleConnectionJSONBody),
		passThroughBody: true,
		headers: {
			"authorization": `${tokenData.token_type} ${tokenData.access_token}`,
			"content-type": "application/json",
		},
		auth: false,
	})) as RESTPutAPICurrentUserApplicationRoleConnectionResult;

	const user = (await client.rest.get(Routes.user(), {
		headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
		auth: false,
	})) as RESTGetAPICurrentUserResult;
	await log(
		`${LoggingEmojis.Integration} ${userMention(
			user.id,
		)} linked their Scratch account [${username}](${
			constants.domains.scratch
		}/users/${username})`,
		LogSeverity.ServerChange,
		{ embeds: [await handleUser(["", "", username])] },
	);
	return response.writeHead(303, { location: config.guild.rulesChannel?.url }).end();

	function getScratchUrl(refreshToken: string): string {
		const encodedRedirectUri = Buffer.from(
			redirectUri + "?refresh_token=" + encodeString(refreshToken),
		).toString("base64");
		return `https://auth.itinerary.eu.org/auth/?name=${encodeURIComponent(
			client.user.displayName,
		)}&redirect=${encodedRedirectUri}`;
	}
}

const secretKey = randomBytes(32);
function encodeString(text: string): string {
	const iv = randomBytes(16);
	const cipher = createCipheriv("aes-256-cbc", secretKey, iv);
	const encrypted = cipher.update(text, "utf8", "hex") + cipher.final("hex");
	return iv.toString("hex") + ":" + encrypted;
}

// Decode the string
function decodeString(encryptedText: string): string {
	const parts = encryptedText.split(":");
	const iv = Buffer.from(parts.shift() ?? "", "hex");
	const decipher = createDecipheriv("aes-256-cbc", secretKey, iv);
	return decipher.update(parts.join(":"), "hex", "utf8") + decipher.final("utf8");
}
