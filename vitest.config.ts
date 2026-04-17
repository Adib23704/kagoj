import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "node",
		setupFiles: ["src/test-setup.ts"],
		include: ["src/**/*.test.ts"],
		exclude: ["node_modules", ".next", "tests/e2e/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/lib/**"],
		},
	},
});
