import { z } from "zod";

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(100);

export const signupSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters").max(100),
		email: z.string().email("Invalid email address"),
		password: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

export const signinSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export const pdfRenameSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
});

export const verifySendSchema = z.object({
	email: z.string().email("Invalid email address"),
});
export type VerifySendInput = z.infer<typeof verifySendSchema>;

export const passwordResetRequestSchema = z.object({
	email: z.string().email("Invalid email address"),
});
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetConfirmSchema = z
	.object({
		token: z.string().min(1, "Token is required"),
		newPassword: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type PdfRenameInput = z.infer<typeof pdfRenameSchema>;
