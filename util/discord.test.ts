import {
	ButtonStyle,
	ComponentType,
	ActionRow as _ActionRow,
	type APIActionRowComponent,
	type APIMessageActionRowComponent,
	type APITextInputComponent,
	type ButtonComponent,
	type InteractionReplyOptions,
	type MessageActionRowComponent,
	type TextInputComponent,
} from "discord.js";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import constants from "../common/constants.js";
import { disableComponents, paginate } from "./discord.js";

// @ts-expect-error TS2675
class ActionRow<T extends MessageActionRowComponent | TextInputComponent> extends _ActionRow<T> {
	constructor(data: APIActionRowComponent<APIMessageActionRowComponent | APITextInputComponent>) {
		super(data);
		this.testing = true;
	}
	testing;
}

await describe("disableComponents", async () => {
	await it("should disable components", () => {
		deepStrictEqual(
			disableComponents([
				new ActionRow<ButtonComponent>({
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
						},
					],
				}),
			]),
			[
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
							disabled: true,
						},
					],
				},
			],
		);
	});
	await it("should disable multiple rows", () => {
		deepStrictEqual(
			disableComponents([
				new ActionRow<ButtonComponent>({
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
						},
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 2",
							custom_id: "button",
						},
					],
				}),
			]),
			[
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
							disabled: true,
						},
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 2",
							custom_id: "button",
							disabled: true,
						},
					],
				},
			],
		);
	});
	await it("should not disable links", () => {
		deepStrictEqual(
			disableComponents([
				new ActionRow<ButtonComponent>({
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "Button 1",
							url: "https://discord.com",
						},
					],
				}),
			]),
			[
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "Button 1",
							url: "https://discord.com",
							disabled: false,
						},
					],
				},
			],
		);
	});
});

await describe("paginate", async () => {
	await it("should only respond once when `user` is `false` option", async () => {
		const messages: InteractionReplyOptions[] = [];
		await paginate(
			[1, 2, 3],
			(value) => value.toString(),
			(message) => {
				messages.push(message);
			},
			{ title: "Pagination Test", singular: "item", user: false },
		);
		strictEqual(messages.length, 1);
	});
	await it("should generate the proper first page", async () => {
		const messages: InteractionReplyOptions[] = [];
		await paginate(
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
			(value) => value.toString(),
			(message) => {
				messages.push(message);
			},
			{ title: "Pagination Test", singular: "item", user: false },
		);
		deepStrictEqual(messages, [
			{
				components: [],
				embeds: [
					{
						title: "Pagination Test",
						description: "1. 1\n2. 2\n3. 3\n4. 4\n5. 5\n6. 6\n7. 7\n8. 8\n9. 9\n10. 10",
						fields: [],
						footer: { text: `Page 1/1 • 10 items` },
						author: undefined,
						color: process.env.NODE_ENV === "production" ? 0xff_7b_26 : 0x17_5e_f8,
					},
				],
			},
		]);
	});
	await it("should respect the `pageLength` option", async () => {
		await paginate(
			[1, 2, 3, 4, 5, 6],
			(value) => value.toString(),
			(message) => {
				const embed = message.embeds?.[0] ?? {};
				ok("description" in embed);
				strictEqual(embed.description, "1. 1\n2. 2\n3. 3");
				strictEqual(embed.footer?.text, `Page 1/2 • 6 items`);
			},
			{ title: "Pagination Test", singular: "item", user: false, pageLength: 3 },
		);
	});
	await it("should respect the `rawOffset` option", async () => {
		await paginate(
			[
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
				24, 25,
			],
			(value) => value.toString(),
			(message) => {
				const embed = message.embeds?.[0] ?? {};
				ok("description" in embed);
				strictEqual(embed.description, "__21. 21__\n22. 22\n23. 23\n24. 24\n25. 25");
				strictEqual(embed.footer?.text, `Page 2/2 • 25 items`);
			},
			{ title: "Pagination Test", singular: "item", user: false, rawOffset: 20 },
		);
	});
	await it("should respect the `generateComponents` option", async () => {
		await paginate(
			[1, 2, 3, 4, 5, 6],
			(value) => value.toString(),
			(message) => {
				deepStrictEqual(message.components?.[0], {
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "custom_component",
							type: ComponentType.StringSelect,
							placeholder: "Cancel",
							options: [
								{ value: "1", label: "1" },
								{ value: "2", label: "2" },
								{ value: "3", label: "3" },
								{ value: "4", label: "4" },
								{ value: "5", label: "5" },
								{ value: "6", label: "6" },
							],
						},
					],
				});
			},
			{
				title: "Pagination Test",
				singular: "item",
				user: false,
				generateComponents(page) {
					return [
						{
							customId: "custom_component",
							type: ComponentType.StringSelect,
							placeholder: "Cancel",
							options: page.map((number) => ({
								value: number.toString(),
								label: number.toString(),
							})),
						},
					];
				},
			},
		);
	});
	await it("should respect the `customComponentLocation` option", async () => {
		await paginate(
			[1, 2, 3, 4, 5, 6],
			(value) => value.toString(),
			(message) => {
				const actionRow = message.components?.[0];
				ok(actionRow);
				ok("components" in actionRow);

				const [select] = actionRow.components;
				ok(select);
				ok("type" in select);
				strictEqual(select.type, ComponentType.StringSelect);
				ok("customId" in select);
				strictEqual(select.customId, "custom_component");
			},
			{
				title: "Pagination Test",
				singular: "item",
				user: false,
				customComponentLocation: "below",
				generateComponents(page) {
					return [
						{
							customId: "custom_component",
							type: ComponentType.StringSelect,
							placeholder: "Cancel",
							options: page.map((number) => ({
								value: number.toString(),
								label: number.toString(),
							})),
						},
					];
				},
			},
		);
	});
	await it("should respect the `failMessage` option", async () => {
		const messages: InteractionReplyOptions[] = [];
		await paginate(
			[],
			(value) => value,
			(message) => {
				messages.push(message);
			},
			{ title: "Pagination Test", singular: "item", user: false, failMessage: "fail" },
		);
		deepStrictEqual(messages, [{ content: `${constants.emojis.statuses.no} fail` }]);
	});
});
