import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { hashResetToken, issuePasswordResetToken } from "@/lib/tokens/password-reset";

const originalEnv = { ...process.env };

beforeEach(() => {
	process.env = { ...originalEnv, RATE_LIMIT_DISABLED: "true" };
});

afterEach(() => {
	process.env = { ...originalEnv };
});

async function makeUser(): Promise<{ id: string; email: string }> {
	const email = `reset-conf-${nanoid(8)}@example.test`;
	const user = await prisma.user.create({
		data: {
			name: "Reset Confirm Test",
			email,
			password: await bcrypt.hash("oldpassword1", 4),
			emailVerified: new Date(),
		},
		select: { id: true, email: true },
	});
	return user;
}

function makeReq(body: unknown): Request {
	return new Request("http://localhost/api/auth/password-reset/confirm", {
		method: "POST",
		headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
		body: JSON.stringify(body),
	});
}

async function cleanup(id: string): Promise<void> {
	await prisma.passwordResetToken.deleteMany({ where: { userId: id } });
	await prisma.user.delete({ where: { id } }).catch(() => undefined);
}

describe("POST /api/auth/password-reset/confirm", () => {
	it("updates the password and marks the token used on success", async () => {
		const user = await makeUser();
		const raw = await issuePasswordResetToken(user.id);

		const { POST } = await import("./route");
		const res = await POST(
			makeReq({ token: raw, newPassword: "newpassword1", confirmPassword: "newpassword1" }),
			undefined
		);
		expect(res.status).toBe(200);

		const updated = await prisma.user.findUnique({ where: { id: user.id } });
		if (!updated) throw new Error("user vanished");
		expect(await bcrypt.compare("newpassword1", updated.password)).toBe(true);
		expect(await bcrypt.compare("oldpassword1", updated.password)).toBe(false);

		const row = await prisma.passwordResetToken.findUnique({
			where: { tokenHash: hashResetToken(raw) },
		});
		if (!row) throw new Error("reset token row vanished");
		expect(row.usedAt).not.toBeNull();

		await cleanup(user.id);
	});

	it("returns 400 for invalid token", async () => {
		const { POST } = await import("./route");
		const res = await POST(
			makeReq({ token: "bogus", newPassword: "newpassword1", confirmPassword: "newpassword1" }),
			undefined
		);
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.error.code).toBe("BAD_REQUEST");
	});

	it("returns 400 for expired token", async () => {
		const user = await makeUser();
		const raw = await issuePasswordResetToken(user.id);
		await prisma.passwordResetToken.update({
			where: { tokenHash: hashResetToken(raw) },
			data: { expires: new Date(Date.now() - 1000) },
		});

		const { POST } = await import("./route");
		const res = await POST(
			makeReq({ token: raw, newPassword: "newpassword1", confirmPassword: "newpassword1" }),
			undefined
		);
		expect(res.status).toBe(400);
		await cleanup(user.id);
	});

	it("returns 400 for already-used token", async () => {
		const user = await makeUser();
		const raw = await issuePasswordResetToken(user.id);
		await prisma.passwordResetToken.update({
			where: { tokenHash: hashResetToken(raw) },
			data: { usedAt: new Date() },
		});

		const { POST } = await import("./route");
		const res = await POST(
			makeReq({ token: raw, newPassword: "newpassword1", confirmPassword: "newpassword1" }),
			undefined
		);
		expect(res.status).toBe(400);
		await cleanup(user.id);
	});

	it("returns 400 for short password (schema enforcement)", async () => {
		const user = await makeUser();
		const raw = await issuePasswordResetToken(user.id);

		const { POST } = await import("./route");
		const res = await POST(
			makeReq({ token: raw, newPassword: "short", confirmPassword: "short" }),
			undefined
		);
		expect(res.status).toBe(400);
		await cleanup(user.id);
	});
});
