import { type NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit, ipKey } from "@/lib/api/with-rate-limit";
import { prisma } from "@/lib/db";
import { mailer } from "@/lib/mailer";
import { passwordReset as passwordResetTemplate } from "@/lib/mailer/templates/password-reset";
import { issuePasswordResetToken } from "@/lib/tokens/password-reset";
import { passwordResetRequestSchema } from "@/lib/validations";

function appUrl(): string {
	return process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}

export const POST = withApi(async (req) => {
	await enforceRateLimit(req as NextRequest, {
		name: "auth-reset-request-ip",
		windowMs: 60 * 60 * 1000,
		max: 3,
		keyOf: ipKey,
	});

	const { email } = await parseJsonBody(req, passwordResetRequestSchema);
	const normalizedEmail = email.toLowerCase();

	await enforceRateLimit(req as NextRequest, {
		name: "auth-reset-request-email",
		windowMs: 60 * 60 * 1000,
		max: 3,
		keyOf: () => normalizedEmail,
	});

	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
		select: { id: true, name: true, email: true },
	});

	if (user) {
		const raw = await issuePasswordResetToken(user.id);
		const resetUrl = `${appUrl()}/reset-password/${raw}`;
		const rendered = passwordResetTemplate({ name: user.name, resetUrl });
		await mailer.send({
			to: user.email,
			subject: rendered.subject,
			text: rendered.text,
			html: rendered.html,
		});
	}

	return NextResponse.json({ ok: true }, { status: 200 });
});
