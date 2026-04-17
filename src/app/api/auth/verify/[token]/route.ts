import { type NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/handler";
import { enforceRateLimit, ipKey } from "@/lib/api/with-rate-limit";
import { prisma } from "@/lib/db";
import { consumeVerificationToken } from "@/lib/tokens/verification";

function appUrl(): string {
	return process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}

interface RouteCtx {
	params: Promise<{ token: string }>;
}

export const GET = withApi<RouteCtx>(async (req, { params }) => {
	await enforceRateLimit(req as NextRequest, {
		name: "auth-verify-get",
		windowMs: 60 * 60 * 1000,
		max: 20,
		keyOf: ipKey,
	});

	const { token } = await params;
	const result = await consumeVerificationToken(token);

	if (!result.ok) {
		return NextResponse.redirect(`${appUrl()}/verify/failed?reason=${result.reason}`, 307);
	}

	await prisma.user.update({
		where: { email: result.email },
		data: { emailVerified: new Date() },
	});

	return NextResponse.redirect(`${appUrl()}/verify/success`, 307);
});
