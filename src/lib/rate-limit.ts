interface RateLimitConfig {
	limit: number;
	windowMs: number;
}

interface RateLimitResult {
	allowed: boolean;
	resetAt: number;
	remaining: number;
	retryAfterSec: number;
}

interface Entry {
	count: number;
	resetAt: number;
}

const MAX_KEYS_PER_BUCKET = 10_000;
const buckets = new Map<string, Map<string, Entry>>();

export function rateLimit(
	bucketName: string,
	key: string,
	config: RateLimitConfig
): RateLimitResult {
	const now = Date.now();
	let bucket = buckets.get(bucketName);
	if (!bucket) {
		bucket = new Map();
		buckets.set(bucketName, bucket);
	}

	if (bucket.size >= MAX_KEYS_PER_BUCKET) {
		for (const [k, v] of bucket) {
			if (v.resetAt <= now) bucket.delete(k);
		}
		while (bucket.size >= MAX_KEYS_PER_BUCKET) {
			const oldestKey = bucket.keys().next().value;
			if (oldestKey === undefined) break;
			bucket.delete(oldestKey);
		}
	}

	let entry = bucket.get(key);
	if (!entry || entry.resetAt <= now) {
		entry = { count: 0, resetAt: now + config.windowMs };
		bucket.set(key, entry);
	}

	entry.count += 1;
	const allowed = entry.count <= config.limit;
	const retryAfterSec = allowed ? 0 : Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

	return {
		allowed,
		resetAt: entry.resetAt,
		remaining: Math.max(0, config.limit - entry.count),
		retryAfterSec,
	};
}

// Accepts a Request (from route handlers) or NextAuth v5's RequestInternal-shaped object
// (which exposes headers as either a Headers instance or a plain record).
type HeadersLike = Headers | Record<string, string | string[] | undefined>;
type WithHeaders = { headers?: HeadersLike };

function readHeader(headers: HeadersLike, name: string): string | undefined {
	if (headers instanceof Headers) {
		return headers.get(name) ?? undefined;
	}
	const value = headers[name] ?? headers[name.toLowerCase()];
	if (Array.isArray(value)) return value[0];
	return value;
}

export function getClientIp(req: WithHeaders): string {
	if (!req.headers) return "unknown";

	const forwarded = readHeader(req.headers, "x-forwarded-for");
	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	const realIp = readHeader(req.headers, "x-real-ip");
	if (realIp) return realIp.trim();
	return "unknown";
}

export const RATE_LIMITS = {
	signin: { limit: 10, windowMs: 60_000 },
	signup: { limit: 5, windowMs: 60 * 60_000 },
	share: { limit: 30, windowMs: 60 * 60_000 },
	upload: { limit: 15, windowMs: 60 * 60_000 },
} as const;
