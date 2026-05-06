import { hash, verify } from "@node-rs/bcrypt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";

const BCRYPT_COST = 12;

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
	throw new Error("NEXTAUTH_SECRET must be set in production");
}

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
	if (!dummyHashPromise) {
		dummyHashPromise = hash("dummy-password", BCRYPT_COST);
	}
	return dummyHashPromise;
}

export async function hashPassword(password: string): Promise<string> {
	return hash(password, BCRYPT_COST);
}

export const { auth, handlers, signIn, signOut } = NextAuth({
	secret: process.env.NEXTAUTH_SECRET,
	useSecureCookies: process.env.NODE_ENV === "production",
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60,
	},
	pages: {
		signIn: "/signin",
	},
	providers: [
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const email = credentials.email as string;
				const password = credentials.password as string;

				const user = await prisma.user.findUnique({
					where: { email },
				});

				const passwordHash = user?.password ?? (await getDummyHash());
				const isValid = await verify(password, passwordHash);

				if (!user || !isValid) {
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
	callbacks: {
		jwt({ token, user }) {
			if (user) {
				token.id = user.id as string;
			}
			return token;
		},
		session({ session, token }) {
			if (session.user) {
				session.user.id = token.id as string;
			}
			return session;
		},
	},
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
