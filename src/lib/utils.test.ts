import { describe, expect, it } from "vitest";
import { cn, formatBytes } from "./utils";

describe("cn", () => {
	it("merges classes and handles falsy values", () => {
		expect(cn("a", "b")).toBe("a b");
		expect(cn("a", false && "b", "c")).toBe("a c");
	});

	it("dedupes conflicting Tailwind classes via twMerge", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});
});

describe("formatBytes", () => {
	it("formats zero bytes", () => {
		expect(formatBytes(0)).toBe("0 Bytes");
	});

	it("formats kilobytes and megabytes", () => {
		expect(formatBytes(1024)).toBe("1 KB");
		expect(formatBytes(1024 * 1024)).toBe("1 MB");
	});

	it("rounds fractional sizes to 2 decimals", () => {
		expect(formatBytes(1536)).toBe("1.5 KB");
	});
});
