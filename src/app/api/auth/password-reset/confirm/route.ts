import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit, ipKey } from "@/lib/api/with-rate-limit";
import { prisma } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/tokens/password-reset";
import { passwordResetConfirmSchema } from "@/lib/validations";

export const POST = withApi(async (req) => {
	await enforceRateLimit(req as NextRequest, {
		name: "auth-reset-confirm",
		windowMs: 60 * 60 * 1000,
		max: 10,
		keyOf: ipKey,
	});

	const { token, newPassword } = await parseJsonBody(req, passwordResetConfirmSchema);

	const result = await consumePasswordResetToken(token);
	if (!result.ok) {
		throw new ApiError("BAD_REQUEST", `Token ${result.reason}`);
	}

	const hashed = await bcrypt.hash(newPassword, 12);
	await prisma.user.update({
		where: { id: result.userId },
		data: { password: hashed },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
});
