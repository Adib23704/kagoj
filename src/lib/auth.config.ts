import type { NextAuthConfig } from "next-auth";

export const authConfig = {
	trustHost: true,
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60,
	},
	pages: {
		signIn: "/signin",
	},
	providers: [],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.sub) {
				session.user.id = token.sub;
			}
			return session;
		},
	},
} satisfies NextAuthConfig;
