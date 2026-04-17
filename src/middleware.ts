import { auth } from "@/lib/auth";

export default auth((req) => {
	if (!req.auth) {
		const signInUrl = new URL("/signin", req.nextUrl.origin);
		signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
		return Response.redirect(signInUrl);
	}
	return;
});

export const config = {
	matcher: ["/dashboard/:path*", "/upload/:path*"],
};
