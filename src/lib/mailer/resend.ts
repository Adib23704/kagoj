import { Resend } from "resend";
import type { MailerAdapter, MailMessage } from "./types";

export interface ResendAdapterOptions {
	apiKey: string;
	from: string;
}

export class ResendAdapter implements MailerAdapter {
	private readonly client: Resend;
	private readonly from: string;

	constructor(opts: ResendAdapterOptions) {
		this.client = new Resend(opts.apiKey);
		this.from = opts.from;
	}

	async send(msg: MailMessage): Promise<void> {
		const result = await this.client.emails.send({
			from: this.from,
			to: msg.to,
			subject: msg.subject,
			text: msg.text,
			...(msg.html ? { html: msg.html } : {}),
			...(msg.headers ? { headers: msg.headers } : {}),
		});
		if (result.error) {
			throw new Error(`Resend send failed: ${result.error.message}`);
		}
	}
}
