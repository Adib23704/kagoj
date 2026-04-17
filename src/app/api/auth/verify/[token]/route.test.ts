import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { issueVerificationToken } from "@/lib/tokens/verification";

const originalEnv = { ...process.env };

beforeEach(() => {
	process.env = { ...originalEnv, RATE_LIMIT_DISABLED: "true" };
});

afterEach(() => {
	process.env = { ...originalEnv };
});

async function makeUnverifiedUser(): Promise<{ id: string; email: string }> {
	const email = `verify-get-${nanoid(8)}@example.test`;
	const user = await prisma.user.create({
		data: {
			name: "Verify GET Test",
			email,
			password: await bcrypt.hash("x", 4),
			emailVerified: null,
		},
		select: { id: true, email: true },
	});
	return user;
}

function makeReq(url: string): Request {
	return new Request(url, {
		method: "GET",
		headers: { "x-forwarded-for": "1.2.3.4" },
	});
}

async function cleanup(id: string, email: string): Promise<void> {
	await prisma.verificationToken.deleteMany({ where: { identifier: email } });
	await prisma.user.delete({ where: { id } }).catch(() => undefined);
}

describe("GET /api/auth/verify/[token]", () => {
	it("redirects to /verify/success and sets emailVerified on valid token", async () => {
		const user = await makeUnverifiedUser();
		const token = await issueVerificationToken(user.email);

		const { GET } = await import("./route");
		const res = await GET(makeReq(`http://localhost/api/auth/verify/${token}`), {
			params: Promise.resolve({ token }),
		});

		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toMatch(/\/verify\/success$/);

		const updated = await prisma.user.findUnique({ where: { id: user.id } });
		expect(updated?.emailVerified).not.toBeNull();

		const row = await prisma.verificationToken.findUnique({ where: { token } });
		expect(row).toBeNull();

		await cleanup(user.id, user.email);
	});

	it("redirects to /verify/failed?reason=invalid for unknown token", async () => {
		const { GET } = await import("./route");
		const res = await GET(makeReq("http://localhost/api/auth/verify/nonexistent"), {
			params: Promise.resolve({ token: "nonexistent" }),
		});
		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toMatch(/\/verify\/failed\?reason=invalid$/);
	});

	it("redirects to /verify/failed?reason=expired for expired token", async () => {
		const user = await makeUnverifiedUser();
		const token = await issueVerificationToken(user.email);
		await prisma.verificationToken.update({
			where: { token },
			data: { expires: new Date(Date.now() - 1000) },
		});

		const { GET } = await import("./route");
		const res = await GET(makeReq(`http://localhost/api/auth/verify/${token}`), {
			params: Promise.resolve({ token }),
		});

		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toMatch(/\/verify\/failed\?reason=expired$/);

		await cleanup(user.id, user.email);
	});
});
