import { NoopAdapter } from "./noop";
import { ResendAdapter } from "./resend";
import type { MailerAdapter } from "./types";

export type { MailerAdapter, MailMessage } from "./types";

function buildAdapter(): MailerAdapter {
	const driver = process.env.MAIL_DRIVER ?? "noop";

	if (driver === "noop") {
		return new NoopAdapter();
	}

	if (driver === "resend") {
		const apiKey = process.env.MAIL_RESEND_API_KEY;
		const from = process.env.MAIL_FROM;
		if (!apiKey) {
			throw new Error("Missing required env var: MAIL_RESEND_API_KEY");
		}
		if (!from) {
			throw new Error("Missing required env var: MAIL_FROM");
		}
		return new ResendAdapter({ apiKey, from });
	}

	if (driver === "smtp") {
		throw new Error(
			"SMTP mailer adapter not supported in this release; set MAIL_DRIVER to 'resend' or 'noop'"
		);
	}

	throw new Error(`Unknown MAIL_DRIVER: ${driver}`);
}

const globalForMailer = globalThis as unknown as { mailer?: MailerAdapter };
export const mailer: MailerAdapter = globalForMailer.mailer ?? buildAdapter();
if (process.env.NODE_ENV !== "production") globalForMailer.mailer = mailer;
