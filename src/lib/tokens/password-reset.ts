import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
	const raw = nanoid(32);
	const tokenHash = hashResetToken(raw);
	const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

	await prisma.$transaction([
		prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
		prisma.passwordResetToken.create({
			data: { userId, tokenHash, expires },
		}),
	]);

	return raw;
}

export type PasswordResetConsumeResult =
	| { ok: true; userId: string }
	| { ok: false; reason: "invalid" | "expired" | "used" };

export async function consumePasswordResetToken(raw: string): Promise<PasswordResetConsumeResult> {
	const tokenHash = hashResetToken(raw);
	const now = new Date();

	const { count } = await prisma.passwordResetToken.updateMany({
		where: {
			tokenHash,
			usedAt: null,
			expires: { gt: now },
		},
		data: { usedAt: now },
	});

	if (count === 1) {
		const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
		if (!row) {
			return { ok: false, reason: "invalid" };
		}
		return { ok: true, userId: row.userId };
	}

	const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
	if (!row) return { ok: false, reason: "invalid" };
	if (row.usedAt !== null) return { ok: false, reason: "used" };
	if (row.expires.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
	return { ok: false, reason: "invalid" };
}
