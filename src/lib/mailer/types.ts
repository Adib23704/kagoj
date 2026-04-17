export interface MailMessage {
	to: string;
	subject: string;
	text: string;
	html?: string;
	headers?: Record<string, string>;
}

export interface MailerAdapter {
	send(msg: MailMessage): Promise<void>;
}
