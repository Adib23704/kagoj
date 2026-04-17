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

function makeReq(body: unknown): Request {
	return new Request("http://localhost/api/auth/signup", {
		method: "POST",
		headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/auth/signup", () => {
	it("creates a user and enqueues a verification email", async () => {
		const email = `signup-${nanoid(8)}@example.test`;
		const { POST } = await import("./route");
		const res = await POST(
			makeReq({
				name: "Signup Test",
				email,
				password: "testpassword1",
				confirmPassword: "testpassword1",
			}),
			undefined
		);
		expect(res.status).toBe(201);

		expect(sendMock).toHaveBeenCalledOnce();
		const call = sendMock.mock.calls[0][0];
		expect(call.to).toBe(email.toLowerCase());
		expect(call.subject).toBe("Verify your email for Kagoj");

		const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
		if (!user) throw new Error("user not created");
		expect(user.emailVerified).toBeNull();

		await prisma.verificationToken.deleteMany({ where: { identifier: email.toLowerCase() } });
		await prisma.user.delete({ where: { email: email.toLowerCase() } });
	});

	it("still returns 201 and persists the user when mailer.send fails", async () => {
		const email = `signup-fail-${nanoid(8)}@example.test`;
		sendMock.mockRejectedValueOnce(new Error("simulated mailer failure"));

		const { POST } = await import("./route");
		const res = await POST(
			makeReq({
				name: "Signup Fail Test",
				email,
				password: "testpassword1",
				confirmPassword: "testpassword1",
			}),
			undefined
		);
		expect(res.status).toBe(201);
		expect(sendMock).toHaveBeenCalledOnce();

		const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
		if (!user) throw new Error("user not persisted");
		expect(user.emailVerified).toBeNull();

		await prisma.verificationToken.deleteMany({ where: { identifier: email.toLowerCase() } });
		await prisma.user.delete({ where: { email: email.toLowerCase() } });
	});

	it("lowercases email at signup so the user can reach verification/reset flows with any case later", async () => {
		const suffix = nanoid(8);
		const signupEmail = `MixedCase-${suffix}@Example.TEST`;
		const normalizedEmail = signupEmail.toLowerCase();

		const { POST } = await import("./route");
		const res = await POST(
			makeReq({
				name: "Case Test",
				email: signupEmail,
				password: "testpassword1",
				confirmPassword: "testpassword1",
			}),
			undefined
		);
		expect(res.status).toBe(201);

		const userByLower = await prisma.user.findUnique({ where: { email: normalizedEmail } });
		expect(userByLower).not.toBeNull();
		const userByOriginal = await prisma.user.findUnique({ where: { email: signupEmail } });
		expect(userByOriginal).toBeNull();

		await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
		await prisma.user.delete({ where: { email: normalizedEmail } });
	});
});
