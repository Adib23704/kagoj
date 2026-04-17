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

afterEach(() => {
	process.env = { ...originalEnv };
});

async function makeUser(): Promise<{ id: string; email: string }> {
	const email = `reset-req-${nanoid(8)}@example.test`.toLowerCase();
	const user = await prisma.user.create({
		data: {
			name: "Reset Request Test",
			email,
			password: await bcrypt.hash("x", 4),
			emailVerified: new Date(),
		},
		select: { id: true, email: true },
	});
	return user;
}

function makeReq(body: unknown): Request {
	return new Request("http://localhost/api/auth/password-reset/request", {
		method: "POST",
		headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
		body: JSON.stringify(body),
	});
}

async function cleanup(id: string): Promise<void> {
	await prisma.passwordResetToken.deleteMany({ where: { userId: id } });
	await prisma.user.delete({ where: { id } }).catch(() => undefined);
}

describe("POST /api/auth/password-reset/request", () => {
	it("returns 200 generic body for unknown email (enumeration-resistant)", async () => {
		const { POST } = await import("./route");
		const res = await POST(makeReq({ email: `missing-${nanoid(6)}@example.test` }), undefined);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json).toEqual({ ok: true });
		expect(sendMock).not.toHaveBeenCalled();
	});

	it("returns 200, creates a reset token, and sends the email for a known account", async () => {
		const user = await makeUser();
		const { POST } = await import("./route");
		const res = await POST(makeReq({ email: user.email }), undefined);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json).toEqual({ ok: true });

		expect(sendMock).toHaveBeenCalledOnce();
		const call = sendMock.mock.calls[0][0];
		expect(call.to).toBe(user.email);
		expect(call.subject).toBe("Reset your Kagoj password");
		expect(call.text).toContain("/reset-password/");

		const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
		expect(tokens).toHaveLength(1);

		await cleanup(user.id);
	});

	it("known + unknown responses are byte-identical", async () => {
		const user = await makeUser();
		const { POST } = await import("./route");
		const knownRes = await POST(makeReq({ email: user.email }), undefined);
		const unknownRes = await POST(
			makeReq({ email: `missing-${nanoid(6)}@example.test` }),
			undefined
		);
		expect(knownRes.status).toBe(unknownRes.status);
		expect(await knownRes.text()).toBe(await unknownRes.text());
		await cleanup(user.id);
	});

	it("returns 400 on invalid email", async () => {
		const { POST } = await import("./route");
		const res = await POST(makeReq({ email: "not-an-email" }), undefined);
		expect(res.status).toBe(400);
	});
});
