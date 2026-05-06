import { type NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp, RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
	try {
		const limit = rateLimit("signup", getClientIp(req), RATE_LIMITS.signup);
		if (!limit.allowed) {
			return NextResponse.json(
				{ error: "Too many signup attempts. Try again later." },
				{ status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
			);
		}

		const body = await req.json();
		const result = signupSchema.safeParse(body);

		if (!result.success) {
			return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
		}

		const { name, email, password } = result.data;

		const existingUser = await prisma.user.findUnique({
			where: { email },
			select: { id: true },
		});

		if (existingUser) {
			return NextResponse.json({ ok: true }, { status: 201 });
		}

		const hashedPassword = await hashPassword(password);

		await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
			},
			select: { id: true },
		});

		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (error) {
		console.error("Signup error:", error);
		return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
	}
}
