import { describe, expect, it } from "vitest";
import { ApiError, apiErrorResponse, unexpectedErrorResponse } from "./errors";

describe("ApiError", () => {
	it("maps codes to HTTP statuses", () => {
		expect(new ApiError("NOT_FOUND", "x").status).toBe(404);
		expect(new ApiError("RATE_LIMITED", "x").status).toBe(429);
		expect(new ApiError("INTERNAL_ERROR", "x").status).toBe(500);
		expect(new ApiError("BAD_REQUEST", "x").status).toBe(400);
		expect(new ApiError("UNAUTHORIZED", "x").status).toBe(401);
	});

	it("preserves the error name", () => {
		expect(new ApiError("CONFLICT", "duplicate").name).toBe("ApiError");
	});

	it("carries optional details", () => {
		const err = new ApiError("BAD_REQUEST", "nope", { field: "email" });
		expect(err.details).toEqual({ field: "email" });
	});
});

describe("apiErrorResponse", () => {
	it("serializes to the standard error shape", async () => {
		const res = apiErrorResponse(new ApiError("BAD_REQUEST", "nope", { field: "x" }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({
			error: { code: "BAD_REQUEST", message: "nope", details: { field: "x" } },
		});
	});

	it("omits details when absent", async () => {
		const res = apiErrorResponse(new ApiError("NOT_FOUND", "missing"));
		const body = await res.json();
		expect(body.error.code).toBe("NOT_FOUND");
		expect(body.error.message).toBe("missing");
		expect(body.error.details).toBeUndefined();
	});
});

describe("unexpectedErrorResponse", () => {
	it("always returns 500 with INTERNAL_ERROR", async () => {
		const res = unexpectedErrorResponse();
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("INTERNAL_ERROR");
	});
});
