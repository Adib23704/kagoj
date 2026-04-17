import { describe, expect, it } from "vitest";
import { verifyEmail } from "./verify-email";

describe("verifyEmail template", () => {
	const rendered = verifyEmail({
		name: "Jane Doe",
		verifyUrl: "https://kagoj.adibdev.me/api/auth/verify/TOKEN123",
	});

	it("subject is locked", () => {
		expect(rendered.subject).toBe("Verify your email for Kagoj");
	});

	it("text body greets the user by name", () => {
		expect(rendered.text).toContain("Hi Jane Doe,");
	});

	it("text body contains the verify URL", () => {
		expect(rendered.text).toContain("https://kagoj.adibdev.me/api/auth/verify/TOKEN123");
	});

	it("text body mentions the 24-hour expiry", () => {
		expect(rendered.text).toMatch(/24 hours/);
	});

	it("text body signs off with — Kagoj", () => {
		expect(rendered.text).toMatch(/—\s*Kagoj$/m);
	});

	it("html body wraps the URL in an anchor tag", () => {
		expect(rendered.html).toContain('<a href="https://kagoj.adibdev.me/api/auth/verify/TOKEN123">');
	});

	it("html body escapes hostile characters in name", () => {
		const malicious = verifyEmail({
			name: '<script>alert("xss")</script>',
			verifyUrl: "https://kagoj.adibdev.me/api/auth/verify/X",
		});
		expect(malicious.html).not.toContain("<script>");
		expect(malicious.html).not.toContain("</script>");
		expect(malicious.html).toContain("&lt;script&gt;");
		expect(malicious.html).toContain("&lt;/script&gt;");
		expect(malicious.html).toContain("&quot;xss&quot;");
	});
});
