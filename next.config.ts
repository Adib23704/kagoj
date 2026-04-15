import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: ["pdfjs-dist", "@prisma/client", "@prisma/adapter-pg"],
	poweredByHeader: false,
	reactStrictMode: true,
};

export default nextConfig;
