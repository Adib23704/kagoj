import type { ZodType } from "zod";
import { ApiError } from "./errors";

export async function parseJsonBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		throw new ApiError("BAD_REQUEST", "Invalid JSON body");
	}
	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		throw new ApiError("BAD_REQUEST", "Validation failed", parsed.error.flatten());
	}
	return parsed.data;
}

export function parseQuery<T>(url: URL, schema: ZodType<T>): T {
	const obj = Object.fromEntries(url.searchParams.entries());
	const parsed = schema.safeParse(obj);
	if (!parsed.success) {
		throw new ApiError("BAD_REQUEST", "Invalid query", parsed.error.flatten());
	}
	return parsed.data;
}
