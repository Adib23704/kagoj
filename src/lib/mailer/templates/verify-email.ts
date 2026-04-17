export interface VerifyEmailVars {
	name: string;
	verifyUrl: string;
}

export function verifyEmail(vars: VerifyEmailVars): {
	subject: string;
	text: string;
	html: string;
} {
	const { name, verifyUrl } = vars;

	const text = `Hi ${name},

Welcome to Kagoj. Click the link below to verify your email address — this unlocks public share links for your documents.

${verifyUrl}

This link expires in 24 hours.

If you didn't create a Kagoj account, you can ignore this email.

— Kagoj
`;

	const html = `<p>Hi ${escapeHtml(name)},</p>
<p>Welcome to Kagoj. Click the link below to verify your email address — this unlocks public share links for your documents.</p>
<p><a href="${escapeAttr(verifyUrl)}">${escapeHtml(verifyUrl)}</a></p>
<p>This link expires in 24 hours.</p>
<p>If you didn't create a Kagoj account, you can ignore this email.</p>
<p>— Kagoj</p>
`;

	return { subject: "Verify your email for Kagoj", text, html };
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
