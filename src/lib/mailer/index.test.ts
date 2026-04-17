import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("mailer factory (buildAdapter)", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.resetModules();
		delete (globalThis as { mailer?: unknown }).mailer;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("returns NoopAdapter when MAIL_DRIVER=noop", async () => {
		process.env.MAIL_DRIVER = "noop";
		process.env.MAIL_FROM = "Kagoj <n@e.com>";
		const { mailer } = await import("./index");
		const { NoopAdapter } = await import("./noop");
		expect(mailer).toBeInstanceOf(NoopAdapter);
	});

	it("returns ResendAdapter when MAIL_DRIVER=resend", async () => {
		process.env.MAIL_DRIVER = "resend";
		process.env.MAIL_RESEND_API_KEY = "k";
		process.env.MAIL_FROM = "Kagoj <n@e.com>";
		const { mailer } = await import("./index");
		const { ResendAdapter } = await import("./resend");
		expect(mailer).toBeInstanceOf(ResendAdapter);
	});

	it("throws a clear error when MAIL_DRIVER=smtp (deferred)", async () => {
		process.env.MAIL_DRIVER = "smtp";
		await expect(import("./index")).rejects.toThrow(/SMTP.*not supported/i);
	});

	it("throws when MAIL_DRIVER is unknown", async () => {
		process.env.MAIL_DRIVER = "carrier-pigeon";
		await expect(import("./index")).rejects.toThrow(/unknown MAIL_DRIVER/i);
	});

	it("throws when MAIL_DRIVER=resend and MAIL_RESEND_API_KEY is missing", async () => {
		process.env.MAIL_DRIVER = "resend";
		delete process.env.MAIL_RESEND_API_KEY;
		process.env.MAIL_FROM = "Kagoj <n@e.com>";
		await expect(import("./index")).rejects.toThrow(/MAIL_RESEND_API_KEY/);
	});

	it("throws when MAIL_FROM is missing for resend", async () => {
		process.env.MAIL_DRIVER = "resend";
		process.env.MAIL_RESEND_API_KEY = "k";
		delete process.env.MAIL_FROM;
		await expect(import("./index")).rejects.toThrow(/MAIL_FROM/);
	});
});
