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
	const now = new Date();
	const result = await prisma.$transaction(async (tx) => {
		const row = await tx.verificationToken.findUnique({ where: { token } });
		if (!row) return { kind: "invalid" as const };
		if (row.expires.getTime() <= now.getTime()) {
			await tx.verificationToken.delete({ where: { token } }).catch((e: unknown) => {
				if (
					typeof e === "object" &&
					e !== null &&
					"code" in e &&
					(e as { code: unknown }).code === "P2025"
				) {
					return;
				}
				throw e;
			});
			return { kind: "expired" as const };
		}
		const { count } = await tx.verificationToken.deleteMany({
			where: { token, expires: { gt: now } },
		});
		if (count === 0) {
			return { kind: "invalid" as const };
		}
		return { kind: "ok" as const, email: row.identifier };
	});

	if (result.kind === "ok") return { ok: true, email: result.email };
	return { ok: false, reason: result.kind };
}
