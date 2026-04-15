import { NextResponse } from "next/server";

export type ApiErrorCode =
	| "BAD_REQUEST"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "PAYLOAD_TOO_LARGE"
	| "UNSUPPORTED_MEDIA_TYPE"
	| "RATE_LIMITED"
	| "INTERNAL_ERROR";

const STATUS_MAP: Record<ApiErrorCode, number> = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	PAYLOAD_TOO_LARGE: 413,
	UNSUPPORTED_MEDIA_TYPE: 415,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
	readonly code: ApiErrorCode;
	readonly status: number;
	readonly details?: unknown;

	constructor(code: ApiErrorCode, message: string, details?: unknown) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = STATUS_MAP[code];
		this.details = details;
	}
}

export function apiErrorResponse(err: ApiError): NextResponse {
	return NextResponse.json(
		{ error: { code: err.code, message: err.message, details: err.details } },
		{ status: err.status }
	);
}

export function unexpectedErrorResponse(): NextResponse {
	return NextResponse.json(
		{ error: { code: "INTERNAL_ERROR", message: "Unexpected error" } },
		{ status: 500 }
	);
}
