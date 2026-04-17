import { logger } from "@/lib/logger";
import type { MailerAdapter, MailMessage } from "./types";

const MAX_BUFFER = 10;

export const lastMessages: MailMessage[] = [];

export class NoopAdapter implements MailerAdapter {
	async send(msg: MailMessage): Promise<void> {
		logger.info({ mailer: "noop", to: msg.to, subject: msg.subject }, "noop-mailer-send");
		lastMessages.push(msg);
		if (lastMessages.length > MAX_BUFFER) {
			lastMessages.shift();
		}
	}
}
