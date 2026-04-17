import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

const sendMock = vi.fn();

vi.mock("@/lib/mailer", () => ({
	mailer: { send: sendMock },
}));

const originalEnv = { ...process.env };

beforeEach(() => {
	process.env = { ...originalEnv, RATE_LIMIT_DISABLED: "true" };
	sendMock.mockReset();
	sendMock.mockResolvedValue(undefined);
});

afterEach(async () => {
	process.env = { ...originalEnv };
});

async function makeUser(opts: { verified: boolean }): Promise<{ id: string; email: string }> {
	const email = `verify-send-${nanoid(8)}@example.test`.toLowerCase();
	const user = await prisma.user.create({
		data: {
			name: "Verify Send Test",
			email,
			password: await bcrypt.hash("x", 4),
			emailVerified: opts.verified ? new Date() : null,
		},
		select: { id: true, email: true },
	});
	return user;
}

function makeReq(body: unknown): Request {
	return new Request("http://localhost/api/auth/verify/send", {
		method: "POST",
		headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
		body: JSON.stringify(body),
	});
}

async function cleanup(userId: string, email: string): Promise<void> {
	await prisma.verificationToken.deleteMany({ where: { identifier: email } });
	await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}

describe("POST /api/auth/verify/send", () => {
	it("returns 200 with a generic body when the account does not exist", async () => {
		const { POST } = await import("./route");
		const res = await POST(makeReq({ email: `no-such-${nanoid(6)}@example.test` }), undefined);
		expect(res.status).toBe(200);
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("returns 200 and does NOT send when the account is already verified", async () => {
		const user = await makeUser({ verified: true });
		const { POST } = await import("./route");
		const res = await POST(makeReq({ email: user.email }), undefined);
		expect(res.status).toBe(200);
		expect(sendMock).not.toHaveBeenCalled();
		await cleanup(user.id, user.email);
	});

	it("returns 200, creates a token, and sends the email when unverified", async () => {
		const user = await makeUser({ verified: false });
		const { POST } = await import("./route");
		const res = await POST(makeReq({ email: user.email }), undefined);
		expect(res.status).toBe(200);
		expect(sendMock).toHaveBeenCalledOnce();
		const call = sendMock.mock.calls[0][0];
		expect(call.to).toBe(user.email);
		expect(call.subject).toBe("Verify your email for Kagoj");
		expect(call.text).toContain("/api/auth/verify/");
		const rows = await prisma.verificationToken.findMany({ where: { identifier: user.email } });
		expect(rows).toHaveLength(1);
		await cleanup(user.id, user.email);
	});

	it("returns 400 on an invalid email", async () => {
		const { POST } = await import("./route");
		const res = await POST(makeReq({ email: "not-an-email" }), undefined);
		expect(res.status).toBe(400);
	});
});
