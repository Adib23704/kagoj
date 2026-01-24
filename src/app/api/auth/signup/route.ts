import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const result = signupSchema.safeParse(body);

		if (!result.success) {
			return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
		}

		const { name, email, password } = result.data;

		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return NextResponse.json({ error: "Email already registered" }, { status: 409 });
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		const user = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
			},
			select: {
				id: true,
				name: true,
				email: true,
			},
		});

		return NextResponse.json({ user }, { status: 201 });
	} catch (error) {
		console.error("Signup error:", error);
		return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
	}
}
