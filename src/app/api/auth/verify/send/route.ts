import { type NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit, ipKey } from "@/lib/api/with-rate-limit";
import { prisma } from "@/lib/db";
import { mailer } from "@/lib/mailer";
import { verifyEmail as verifyEmailTemplate } from "@/lib/mailer/templates/verify-email";
import { issueVerificationToken } from "@/lib/tokens/verification";
import { verifySendSchema } from "@/lib/validations";

function appUrl(): string {
	return process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}

export const POST = withApi(async (req) => {
	await enforceRateLimit(req as NextRequest, {
		name: "auth-verify-send-ip",
		windowMs: 60 * 60 * 1000,
		max: 3,
		keyOf: ipKey,
	});

	const { email } = await parseJsonBody(req, verifySendSchema);
	const normalizedEmail = email.toLowerCase();

	await enforceRateLimit(req as NextRequest, {
		name: "auth-verify-send-email",
		windowMs: 60 * 60 * 1000,
		max: 3,
		keyOf: () => normalizedEmail,
	});

	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
		select: { id: true, name: true, email: true, emailVerified: true },
	});

	if (user && user.emailVerified === null) {
		const token = await issueVerificationToken(user.email);
		const verifyUrl = `${appUrl()}/api/auth/verify/${token}`;
		const rendered = verifyEmailTemplate({ name: user.name, verifyUrl });
		await mailer.send({
			to: user.email,
			subject: rendered.subject,
			text: rendered.text,
			html: rendered.html,
		});
	}

	return NextResponse.json({ ok: true }, { status: 200 });
});
