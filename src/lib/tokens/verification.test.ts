import { nanoid } from "nanoid";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
	consumeVerificationToken,
	issueVerificationToken,
	VERIFICATION_TTL_MS,
} from "./verification";

function uniqueEmail(): string {
	return `verify-test-${nanoid(8)}@example.test`;
}

async function cleanup(email: string): Promise<void> {
	await prisma.verificationToken.deleteMany({ where: { identifier: email } });
}

describe("verification tokens", () => {
	const emails: string[] = [];

	afterEach(async () => {
		for (const email of emails) await cleanup(email);
		emails.length = 0;
	});

	it("issue() returns a 32-char URL-safe token", async () => {
		const email = uniqueEmail();
		emails.push(email);
		const token = await issueVerificationToken(email);
		expect(token).toHaveLength(32);
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it("issue() persists a row with the correct expiry (~24h)", async () => {
		const email = uniqueEmail();
		emails.push(email);
		const token = await issueVerificationToken(email);
		const row = await prisma.verificationToken.findUnique({ where: { token } });
		expect(row).not.toBeNull();
		if (!row) return;
		const deltaMs = row.expires.getTime() - Date.now();
		expect(deltaMs).toBeGreaterThan(VERIFICATION_TTL_MS - 60_000);
		expect(deltaMs).toBeLessThanOrEqual(VERIFICATION_TTL_MS);
	});

	it("issue() deletes prior tokens for the same identifier", async () => {
		const email = uniqueEmail();
		emails.push(email);
		const t1 = await issueVerificationToken(email);
		const t2 = await issueVerificationToken(email);
		expect(t1).not.toBe(t2);
		const rows = await prisma.verificationToken.findMany({ where: { identifier: email } });
		expect(rows).toHaveLength(1);
		expect(rows[0].token).toBe(t2);
	});

	it("consume() returns the email and deletes the row on success", async () => {
		const email = uniqueEmail();
		emails.push(email);
		const token = await issueVerificationToken(email);
		const result = await consumeVerificationToken(token);
		expect(result).toEqual({ ok: true, email });
		expect(await prisma.verificationToken.findUnique({ where: { token } })).toBeNull();
	});

	it("consume() returns invalid for unknown tokens", async () => {
		const result = await consumeVerificationToken("nonexistent-token-value-abcdef");
		expect(result).toEqual({ ok: false, reason: "invalid" });
	});

	it("consume() returns expired for tokens past their expiry", async () => {
		const email = uniqueEmail();
		emails.push(email);
		const token = await issueVerificationToken(email);
		await prisma.verificationToken.update({
			where: { token },
			data: { expires: new Date(Date.now() - 1000) },
		});
		const result = await consumeVerificationToken(token);
		expect(result).toEqual({ ok: false, reason: "expired" });
	});

	it("issue() for one identifier does not touch another identifier's token", async () => {
		const emailA = uniqueEmail();
		const emailB = uniqueEmail();
		emails.push(emailA, emailB);
		const tokenB = await issueVerificationToken(emailB);
		await issueVerificationToken(emailA);
		const rowB = await prisma.verificationToken.findUnique({ where: { token: tokenB } });
		expect(rowB).not.toBeNull();
		expect(rowB?.identifier).toBe(emailB);
	});

	it("consume() is race-safe: only one of two concurrent consumers wins", async () => {
		const email = uniqueEmail();
		emails.push(email);
		const token = await issueVerificationToken(email);

		const [r1, r2] = await Promise.all([
			consumeVerificationToken(token),
			consumeVerificationToken(token),
		]);

		const okResults = [r1, r2].filter((r) => r.ok);
		const failResults = [r1, r2].filter((r) => !r.ok);
		expect(okResults).toHaveLength(1);
		expect(failResults).toHaveLength(1);
		if (!failResults[0].ok) {
			expect(failResults[0].reason).toBe("invalid");
		}
	});
});
