import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	serverExternalPackages: ["pdfjs-dist", "@prisma/client", "@prisma/adapter-pg"],
	poweredByHeader: false,
	reactStrictMode: true,
};

export default nextConfig;
