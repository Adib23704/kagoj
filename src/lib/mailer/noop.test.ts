import { beforeEach, describe, expect, it } from "vitest";
import { lastMessages, NoopAdapter } from "./noop";
import type { MailMessage } from "./types";

function makeMsg(overrides: Partial<MailMessage> = {}): MailMessage {
	return {
		to: "user@example.com",
		subject: "Subject",
		text: "Body",
		...overrides,
	};
}

describe("NoopAdapter", () => {
	beforeEach(() => {
		lastMessages.length = 0;
	});

	it("send() does not throw", async () => {
		const a = new NoopAdapter();
		await expect(a.send(makeMsg())).resolves.toBeUndefined();
	});

	it("send() appends to the ring buffer", async () => {
		const a = new NoopAdapter();
		await a.send(makeMsg({ to: "a@example.com", subject: "First" }));
		await a.send(makeMsg({ to: "b@example.com", subject: "Second" }));
		expect(lastMessages).toHaveLength(2);
		expect(lastMessages[0].to).toBe("a@example.com");
		expect(lastMessages[1].subject).toBe("Second");
	});

	it("ring buffer retains at most 10 messages (evicts oldest)", async () => {
		const a = new NoopAdapter();
		for (let i = 0; i < 12; i++) {
			await a.send(makeMsg({ subject: `msg-${i}` }));
		}
		expect(lastMessages).toHaveLength(10);
		expect(lastMessages[0].subject).toBe("msg-2");
		expect(lastMessages[9].subject).toBe("msg-11");
	});
});
