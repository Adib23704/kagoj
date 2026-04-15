import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLimiter, RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("allows up to N requests within the window", () => {
		const rl = new RateLimiter({ windowMs: 60_000, max: 3 });
		expect(rl.check("ip:1.2.3.4").allowed).toBe(true);
		expect(rl.check("ip:1.2.3.4").allowed).toBe(true);
		expect(rl.check("ip:1.2.3.4").allowed).toBe(true);
		expect(rl.check("ip:1.2.3.4").allowed).toBe(false);
	});

	it("resets after the window elapses", () => {
		const rl = new RateLimiter({ windowMs: 60_000, max: 2 });
		rl.check("k");
		rl.check("k");
		expect(rl.check("k").allowed).toBe(false);
		vi.advanceTimersByTime(61_000);
		expect(rl.check("k").allowed).toBe(true);
	});

	it("tracks distinct keys independently", () => {
		const rl = new RateLimiter({ windowMs: 60_000, max: 1 });
		expect(rl.check("a").allowed).toBe(true);
		expect(rl.check("b").allowed).toBe(true);
		expect(rl.check("a").allowed).toBe(false);
	});

	it("evicts expired entries via sweep()", () => {
		const rl = new RateLimiter({ windowMs: 1_000, max: 1 });
		rl.check("k");
		vi.advanceTimersByTime(2_000);
		rl.sweep();
		expect(rl.size()).toBe(0);
	});

	it("returns retryAfterMs when blocked", () => {
		const rl = new RateLimiter({ windowMs: 60_000, max: 1 });
		rl.check("k");
		const r = rl.check("k");
		expect(r.allowed).toBe(false);
		expect(r.retryAfterMs).toBeGreaterThan(0);
		expect(r.retryAfterMs).toBeLessThanOrEqual(60_000);
	});

	it("remaining decrements as requests are consumed", () => {
		const rl = new RateLimiter({ windowMs: 60_000, max: 3 });
		expect(rl.check("k").remaining).toBe(2);
		expect(rl.check("k").remaining).toBe(1);
		expect(rl.check("k").remaining).toBe(0);
	});
});

describe("getLimiter", () => {
	it("returns the same instance for the same name", () => {
		const a = getLimiter("test-scope-1", { windowMs: 1000, max: 5 });
		const b = getLimiter("test-scope-1", { windowMs: 1000, max: 5 });
		expect(a).toBe(b);
	});

	it("returns different instances for different names", () => {
		const a = getLimiter("test-scope-A", { windowMs: 1000, max: 5 });
		const b = getLimiter("test-scope-B", { windowMs: 1000, max: 5 });
		expect(a).not.toBe(b);
	});
});
