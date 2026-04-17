import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
	Resend: vi.fn(function (this: { emails: { send: typeof sendMock } }) {
		this.emails = { send: sendMock };
	}),
}));

import { ResendAdapter } from "./resend";

describe("ResendAdapter", () => {
	beforeEach(() => {
		sendMock.mockReset();
	});

	it("constructs with apiKey and from", () => {
		const a = new ResendAdapter({ apiKey: "k", from: "Kagoj <n@e.com>" });
		expect(a).toBeInstanceOf(ResendAdapter);
	});

	it("send() forwards to Resend SDK with correct payload", async () => {
		sendMock.mockResolvedValueOnce({ data: { id: "e_1" }, error: null });
		const a = new ResendAdapter({ apiKey: "k", from: "Kagoj <noreply@example.com>" });
		await a.send({
			to: "user@example.com",
			subject: "Hi",
			text: "plain body",
			html: "<p>plain body</p>",
		});
		expect(sendMock).toHaveBeenCalledOnce();
		expect(sendMock).toHaveBeenCalledWith({
			from: "Kagoj <noreply@example.com>",
			to: "user@example.com",
			subject: "Hi",
			text: "plain body",
			html: "<p>plain body</p>",
		});
	});

	it("send() omits html from the payload when input has no html", async () => {
		sendMock.mockResolvedValueOnce({ data: { id: "e_2" }, error: null });
		const a = new ResendAdapter({ apiKey: "k", from: "Kagoj <n@e.com>" });
		await a.send({ to: "user@example.com", subject: "x", text: "y" });
		expect(sendMock).toHaveBeenCalledOnce();
		const payload = sendMock.mock.calls[0][0];
		expect(payload).not.toHaveProperty("html");
		expect(payload).not.toHaveProperty("headers");
	});

	it("send() throws when Resend returns an error", async () => {
		sendMock.mockResolvedValueOnce({ data: null, error: { message: "domain unverified" } });
		const a = new ResendAdapter({ apiKey: "k", from: "Kagoj <n@e.com>" });
		await expect(a.send({ to: "user@example.com", subject: "x", text: "y" })).rejects.toThrow(
			/domain unverified/
		);
	});
});
