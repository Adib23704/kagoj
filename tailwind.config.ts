import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				"bg-base": "var(--bg-base)",
				"bg-raised": "var(--bg-raised)",
				"bg-input": "var(--bg-input)",
				"border-muted": "var(--border-muted)",
				"border-strong": "var(--border-strong)",
				"text-primary": "var(--text-primary)",
				"text-muted": "var(--text-muted)",
				"text-subtle": "var(--text-subtle)",
				accent: "var(--accent)",
				"accent-hover": "var(--accent-hover)",
				danger: "var(--danger)",
				"danger-hover": "var(--danger-hover)",
			},
		},
	},
	plugins: [],
};

export default config;
