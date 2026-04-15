import type { NextRequest } from "next/server";
import { getLimiter, type RateLimitOptions } from "@/lib/rate-limit";
import { ApiError } from "./errors";

export interface RateLimitConfig extends RateLimitOptions {
	name: string;
	keyOf: (req: NextRequest) => string | Promise<string>;
}

export async function enforceRateLimit(req: NextRequest, cfg: RateLimitConfig): Promise<void> {
	if (process.env.RATE_LIMIT_DISABLED === "true") return;
	const key = await cfg.keyOf(req);
	const rl = getLimiter(cfg.name, { windowMs: cfg.windowMs, max: cfg.max });
	const result = rl.check(`${cfg.name}:${key}`);
	if (!result.allowed) {
		throw new ApiError("RATE_LIMITED", "Too many requests", {
			retryAfterMs: result.retryAfterMs,
		});
	}
}

export function ipKey(req: NextRequest): string {
	const fwd = req.headers.get("x-forwarded-for");
	if (fwd) return fwd.split(",")[0].trim();
	return req.headers.get("x-real-ip") ?? "unknown";
}
