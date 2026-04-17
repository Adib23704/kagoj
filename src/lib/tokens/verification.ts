import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function issueVerificationToken(email: string): Promise<string> {
	const token = nanoid(32);
	const expires = new Date(Date.now() + VERIFICATION_TTL_MS);

	await prisma.$transaction([
		prisma.verificationToken.deleteMany({ where: { identifier: email } }),
		prisma.verificationToken.create({
			data: { identifier: email, token, expires },
		}),
	]);

	return token;
}

export type VerificationConsumeResult =
	| { ok: true; email: string }
	| { ok: false; reason: "invalid" | "expired" };

export async function consumeVerificationToken(token: string): Promise<VerificationConsumeResult> {
	const row = await prisma.verificationToken.findUnique({ where: { token } });
	if (!row) {
		return { ok: false, reason: "invalid" };
	}
	if (row.expires.getTime() <= Date.now()) {
		await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
		return { ok: false, reason: "expired" };
	}
	await prisma.verificationToken.delete({ where: { token } });
	return { ok: true, email: row.identifier };
}
