import { describe, expect, it } from "vitest";
import { pdfRenameSchema, signinSchema, signupSchema } from "./validations";

describe("signupSchema", () => {
	const base = {
		name: "Jane Doe",
		email: "jane@example.com",
		password: "supersecret",
		confirmPassword: "supersecret",
	};

	it("accepts a valid signup payload", () => {
		expect(signupSchema.safeParse(base).success).toBe(true);
	});

	it("rejects a name shorter than 2 chars", () => {
		expect(signupSchema.safeParse({ ...base, name: "J" }).success).toBe(false);
	});

	it("rejects a name longer than 100 chars", () => {
		expect(signupSchema.safeParse({ ...base, name: "a".repeat(101) }).success).toBe(false);
	});

	it("rejects a malformed email", () => {
		expect(signupSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
	});

	it("rejects a password shorter than 8 chars", () => {
		expect(
			signupSchema.safeParse({ ...base, password: "1234567", confirmPassword: "1234567" }).success
		).toBe(false);
	});

	it("rejects when passwords do not match", () => {
		const r = signupSchema.safeParse({ ...base, confirmPassword: "different" });
		expect(r.success).toBe(false);
	});
});

describe("signinSchema", () => {
	it("accepts a valid signin payload", () => {
		expect(signinSchema.safeParse({ email: "a@b.com", password: "anything" }).success).toBe(true);
	});

	it("rejects missing email", () => {
		expect(signinSchema.safeParse({ password: "anything" }).success).toBe(false);
	});

	it("rejects missing password", () => {
		expect(signinSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
	});

	it("rejects an empty password", () => {
		expect(signinSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
	});
});

describe("pdfRenameSchema", () => {
	it("accepts a normal name", () => {
		expect(pdfRenameSchema.safeParse({ name: "My book" }).success).toBe(true);
	});

	it("rejects an empty name", () => {
		expect(pdfRenameSchema.safeParse({ name: "" }).success).toBe(false);
	});

	it("rejects a name over 255 chars", () => {
		expect(pdfRenameSchema.safeParse({ name: "a".repeat(256) }).success).toBe(false);
	});
});
