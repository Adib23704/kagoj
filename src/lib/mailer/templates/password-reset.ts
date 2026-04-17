export interface PasswordResetVars {
	name: string;
	resetUrl: string;
}

export function passwordReset(vars: PasswordResetVars): {
	subject: string;
	text: string;
	html: string;
} {
	const { name, resetUrl } = vars;

	const text = `Hi ${name},

Someone (hopefully you) asked to reset the password on your Kagoj account. Click the link below to pick a new one.

${resetUrl}

This link expires in 1 hour and can only be used once.

If you didn't request a password reset, you can safely ignore this email — your password hasn't changed.

— Kagoj
`;

	const html = `<p>Hi ${escapeHtml(name)},</p>
<p>Someone (hopefully you) asked to reset the password on your Kagoj account. Click the link below to pick a new one.</p>
<p><a href="${escapeAttr(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
<p>This link expires in 1 hour and can only be used once.</p>
<p>If you didn't request a password reset, you can safely ignore this email — your password hasn't changed.</p>
<p>— Kagoj</p>
`;

	return { subject: "Reset your Kagoj password", text, html };
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
