import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
	title: "Kagoj - Share PDFs as Flipbooks",
	description:
		"Upload PDFs and share them as interactive flipbooks with realistic page-turning animations",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
