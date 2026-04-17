import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "./db";
import { logger } from "./logger";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!authSecret) {
	throw new Error("AUTH_SECRET (or the deprecated NEXTAUTH_SECRET) must be set.");
}

if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
	logger.warn("NEXTAUTH_SECRET is deprecated; rename it to AUTH_SECRET (removed in Phase 2b).");
}

if (process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
	logger.warn("NEXTAUTH_URL is deprecated; rename it to AUTH_URL (removed in Phase 2b).");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	...authConfig,
	secret: authSecret,
	providers: [
		Credentials({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const email = typeof credentials?.email === "string" ? credentials.email : null;
				const password = typeof credentials?.password === "string" ? credentials.password : null;

				if (!email || !password) {
					return null;
				}

				const user = await prisma.user.findUnique({
					where: { email },
				});

				if (!user?.password) {
					return null;
				}

				const isValid = await bcrypt.compare(password, user.password);

				if (!isValid) {
					return null;
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
				};
			},
		}),
	],
});

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			email?: string | null;
			name?: string | null;
		};
	}
}
