export interface RateLimitOptions {
	windowMs: number;
	max: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfterMs: number;
}

interface Entry {
	count: number;
	resetAt: number;
}

export class RateLimiter {
	private readonly windowMs: number;
	private readonly max: number;
	private readonly map = new Map<string, Entry>();

	constructor(opts: RateLimitOptions) {
		this.windowMs = opts.windowMs;
		this.max = opts.max;
	}

	check(key: string): RateLimitResult {
		const now = Date.now();
		const entry = this.map.get(key);
		if (!entry || entry.resetAt <= now) {
			this.map.set(key, { count: 1, resetAt: now + this.windowMs });
			return { allowed: true, remaining: this.max - 1, retryAfterMs: 0 };
		}
		if (entry.count >= this.max) {
			return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
		}
		entry.count += 1;
		return { allowed: true, remaining: this.max - entry.count, retryAfterMs: 0 };
	}

	sweep(): void {
		const now = Date.now();
		for (const [k, v] of this.map) {
			if (v.resetAt <= now) this.map.delete(k);
		}
	}

	size(): number {
		return this.map.size;
	}
}

const limiters = new Map<string, RateLimiter>();

export function getLimiter(name: string, opts: RateLimitOptions): RateLimiter {
	const existing = limiters.get(name);
	if (existing) return existing;
	const rl = new RateLimiter(opts);
	limiters.set(name, rl);
	return rl;
}

if (typeof setInterval !== "undefined" && process.env.NODE_ENV !== "test") {
	const handle = setInterval(
		() => {
			for (const rl of limiters.values()) rl.sweep();
		},
		5 * 60 * 1000
	);
	handle.unref?.();
}
