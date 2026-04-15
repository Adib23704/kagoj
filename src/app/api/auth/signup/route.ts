import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/validation";
import { enforceRateLimit, ipKey } from "@/lib/api/with-rate-limit";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations";

export const POST = withApi(async (req: Request) => {
	await enforceRateLimit(req as NextRequest, {
		name: "auth-signup",
		windowMs: 60 * 60 * 1000,
		max: 5,
		keyOf: ipKey,
	});

	const { name, email, password } = await parseJsonBody(req, signupSchema);

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		throw new ApiError("CONFLICT", "Email already registered");
	}

	const hashedPassword = await bcrypt.hash(password, 12);
	const user = await prisma.user.create({
		data: { name, email, password: hashedPassword },
		select: { id: true, name: true, email: true },
	});

	return NextResponse.json({ user }, { status: 201 });
});
