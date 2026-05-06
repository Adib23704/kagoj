import { z } from "zod";

const PASSWORD_MAX = 72;

export const signupSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters").max(100),
		email: z.string().email("Invalid email address"),
		password: z.string().min(8, "Password must be at least 8 characters").max(PASSWORD_MAX),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

export const signinSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required").max(PASSWORD_MAX),
});

function isValidPdfName(name: string): boolean {
	if (/[<>:"|?*\\/]/.test(name)) return false;
	for (const ch of name) {
		if (ch.charCodeAt(0) < 0x20) return false;
	}
	return true;
}

export const pdfRenameSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(255)
		.refine(isValidPdfName, "Name contains invalid characters"),
});

export const createShareSchema = z.object({
	pdfId: z.string().min(1).max(50),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type PdfRenameInput = z.infer<typeof pdfRenameSchema>;
export type CreateShareInput = z.infer<typeof createShareSchema>;
