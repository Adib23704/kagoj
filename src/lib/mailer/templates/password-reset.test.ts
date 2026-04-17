import { describe, expect, it } from "vitest";
import { passwordReset } from "./password-reset";

describe("passwordReset template", () => {
	const rendered = passwordReset({
		name: "Jane Doe",
		resetUrl: "https://kagoj.adibdev.me/reset-password/TOKEN456",
	});

	it("subject is locked", () => {
		expect(rendered.subject).toBe("Reset your Kagoj password");
	});

	it("text body greets the user by name", () => {
		expect(rendered.text).toContain("Hi Jane Doe,");
	});

	it("text body contains the reset URL", () => {
		expect(rendered.text).toContain("https://kagoj.adibdev.me/reset-password/TOKEN456");
	});

	it("text body mentions the 1-hour expiry and single use", () => {
		expect(rendered.text).toMatch(/1 hour/);
		expect(rendered.text).toMatch(/only be used once/);
	});

	it("text body reassures the user their password hasn't changed", () => {
		expect(rendered.text).toMatch(/password hasn't changed/);
	});

	it("html body wraps the URL in an anchor tag", () => {
		expect(rendered.html).toContain('<a href="https://kagoj.adibdev.me/reset-password/TOKEN456">');
	});

	it("html body escapes hostile characters in name", () => {
		const malicious = passwordReset({
			name: '<script>alert("xss")</script>',
			resetUrl: "https://kagoj.adibdev.me/reset-password/X",
		});
		expect(malicious.html).not.toContain("<script>");
		expect(malicious.html).not.toContain("</script>");
		expect(malicious.html).toContain("&lt;script&gt;");
		expect(malicious.html).toContain("&lt;/script&gt;");
		expect(malicious.html).toContain("&quot;xss&quot;");
	});
});
