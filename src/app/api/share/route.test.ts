import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const originalEnv = { ...process.env };

beforeEach(() => {
	process.env = {
		...originalEnv,
		RATE_LIMIT_DISABLED: "true",
		AUTH_REQUIRE_VERIFICATION_FOR_SHARES: "true",
		NEXT_PUBLIC_APP_URL: "http://localhost:3000",
	};
	authMock.mockReset();
});

afterEach(() => {
	process.env = { ...originalEnv };
});

async function seed(opts: { verified: boolean }): Promise<{ userId: string; pdfId: string }> {
	const email = `share-test-${nanoid(8)}@example.test`;
	const user = await prisma.user.create({
		data: {
			name: "Share Test",
			email,
			password: await bcrypt.hash("x", 4),
			emailVerified: opts.verified ? new Date() : null,
		},
	});
	const pdf = await prisma.pdf.create({
		data: {
			name: "test.pdf",
			originalName: "test.pdf",
			storagePath: "x",
			fileSize: 1,
			pageCount: 1,
			userId: user.id,
		},
	});
	return { userId: user.id, pdfId: pdf.id };
}

async function cleanup(userId: string): Promise<void> {
	await prisma.shareLink.deleteMany({ where: { pdf: { userId } } });
	await prisma.pdf.deleteMany({ where: { userId } });
	await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}

function makeReq(body: unknown): Request {
	return new Request("http://localhost/api/share", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/share", () => {
	it("returns 401 when unauthenticated", async () => {
		authMock.mockResolvedValue(null);
		const { POST } = await import("./route");
		const res = await POST(makeReq({ pdfId: "anything" }), undefined);
		expect(res.status).toBe(401);
	});

	it("returns 403 { code: EMAIL_NOT_VERIFIED } when unverified and gate on", async () => {
		const { userId, pdfId } = await seed({ verified: false });
		authMock.mockResolvedValue({ user: { id: userId } });

		const { POST } = await import("./route");
		const res = await POST(makeReq({ pdfId }), undefined);
		expect(res.status).toBe(403);
		const json = await res.json();
		expect(json.error.code).toBe("EMAIL_NOT_VERIFIED");
		expect(json.error.message).toMatch(/verify your email/i);

		await cleanup(userId);
	});

	it("allows unverified users when AUTH_REQUIRE_VERIFICATION_FOR_SHARES=false", async () => {
		process.env.AUTH_REQUIRE_VERIFICATION_FOR_SHARES = "false";
		const { userId, pdfId } = await seed({ verified: false });
		authMock.mockResolvedValue({ user: { id: userId } });

		const { POST } = await import("./route");
		const res = await POST(makeReq({ pdfId }), undefined);
		expect(res.status).toBe(201);

		await cleanup(userId);
	});

	it("creates a share link for verified users", async () => {
		const { userId, pdfId } = await seed({ verified: true });
		authMock.mockResolvedValue({ user: { id: userId } });

		const { POST } = await import("./route");
		const res = await POST(makeReq({ pdfId }), undefined);
		expect(res.status).toBe(201);
		const json = await res.json();
		expect(json.shareUrl).toMatch(/http:\/\/localhost:3000\/view\//);
		expect(json.shareLink.shareId).toBeDefined();

		await cleanup(userId);
	});

	it("returns 404 when the pdf isn't owned by the user", async () => {
		const { userId } = await seed({ verified: true });
		authMock.mockResolvedValue({ user: { id: userId } });

		const { POST } = await import("./route");
		const res = await POST(makeReq({ pdfId: "not-my-pdf" }), undefined);
		expect(res.status).toBe(404);

		await cleanup(userId);
	});
});
