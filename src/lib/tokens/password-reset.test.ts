import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
	consumePasswordResetToken,
	hashResetToken,
	issuePasswordResetToken,
	PASSWORD_RESET_TTL_MS,
} from "./password-reset";

async function makeUser(): Promise<{ id: string; email: string }> {
	const email = `reset-test-${nanoid(8)}@example.test`;
	const user = await prisma.user.create({
		data: {
			name: "Reset Test",
			email,
			password: await bcrypt.hash("placeholder", 4),
			emailVerified: new Date(),
		},
		select: { id: true, email: true },
	});
	return user;
}

describe("password reset tokens", () => {
	const userIds: string[] = [];

	afterEach(async () => {
		for (const id of userIds) {
			await prisma.user.delete({ where: { id } }).catch(() => undefined);
		}
		userIds.length = 0;
	});

	it("hashResetToken() is sha256 hex", () => {
		const hash = hashResetToken("hello");
		expect(hash).toBe(createHash("sha256").update("hello").digest("hex"));
		expect(hash).toHaveLength(64);
	});

	it("issue() returns a 32-char token and stores its hash (never the raw)", async () => {
		const user = await makeUser();
		userIds.push(user.id);
		const raw = await issuePasswordResetToken(user.id);
		expect(raw).toHaveLength(32);

		const rows = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
		expect(rows).toHaveLength(1);
		expect(rows[0].tokenHash).toBe(hashResetToken(raw));
		expect(rows[0].tokenHash).not.toBe(raw);
	});

	it("issue() sets expiry ~1h in the future", async () => {
		const user = await makeUser();
		userIds.push(user.id);
		const raw = await issuePasswordResetToken(user.id);
		const row = await prisma.passwordResetToken.findFirst({
			where: { tokenHash: hashResetToken(raw) },
		});
		if (!row) return;
		const delta = row.expires.getTime() - Date.now();
		expect(delta).toBeGreaterThan(PASSWORD_RESET_TTL_MS - 60_000);
		expect(delta).toBeLessThanOrEqual(PASSWORD_RESET_TTL_MS);
	});

	it("issue() deletes prior UNUSED tokens for the user but preserves used ones", async () => {
		const user = await makeUser();
		userIds.push(user.id);
		const t1 = await issuePasswordResetToken(user.id);
		await prisma.passwordResetToken.update({
			where: { tokenHash: hashResetToken(t1) },
			data: { usedAt: new Date() },
		});
		const t2 = await issuePasswordResetToken(user.id);

		const rows = await prisma.passwordResetToken.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "asc" },
		});
		expect(rows).toHaveLength(2);
		expect(rows[0].tokenHash).toBe(hashResetToken(t1));
		expect(rows[0].usedAt).not.toBeNull();
		expect(rows[1].tokenHash).toBe(hashResetToken(t2));
		expect(rows[1].usedAt).toBeNull();
	});

	it("consume() returns the userId and sets usedAt on success", async () => {
		const user = await makeUser();
		userIds.push(user.id);
		const raw = await issuePasswordResetToken(user.id);
		const result = await consumePasswordResetToken(raw);
		expect(result).toEqual({ ok: true, userId: user.id });
		const row = await prisma.passwordResetToken.findUnique({
			where: { tokenHash: hashResetToken(raw) },
		});
		if (!row) return;
		expect(row.usedAt).not.toBeNull();
	});

	it("consume() returns invalid for unknown tokens", async () => {
		const result = await consumePasswordResetToken("nonexistent-xyz-0123456789");
		expect(result).toEqual({ ok: false, reason: "invalid" });
	});

	it("consume() returns expired for tokens past expiry", async () => {
		const user = await makeUser();
		userIds.push(user.id);
		const raw = await issuePasswordResetToken(user.id);
		await prisma.passwordResetToken.update({
			where: { tokenHash: hashResetToken(raw) },
			data: { expires: new Date(Date.now() - 1000) },
		});
		const result = await consumePasswordResetToken(raw);
		expect(result).toEqual({ ok: false, reason: "expired" });
	});

	it("consume() returns used for tokens already consumed", async () => {
		const user = await makeUser();
		userIds.push(user.id);
		const raw = await issuePasswordResetToken(user.id);
		await consumePasswordResetToken(raw);
		const second = await consumePasswordResetToken(raw);
		expect(second).toEqual({ ok: false, reason: "used" });
	});

	it("consume() is race-safe: only one of two concurrent consumers wins", async () => {
		const user = await makeUser();
		userIds.push(user.id);
		const raw = await issuePasswordResetToken(user.id);

		const [r1, r2] = await Promise.all([
			consumePasswordResetToken(raw),
			consumePasswordResetToken(raw),
		]);

		const okResults = [r1, r2].filter((r) => r.ok);
		const failResults = [r1, r2].filter((r) => !r.ok);
		expect(okResults).toHaveLength(1);
		expect(failResults).toHaveLength(1);
		if (!failResults[0].ok) {
			expect(failResults[0].reason).toBe("used");
		}
	});
});
