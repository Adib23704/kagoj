import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ApiError, apiErrorResponse, unexpectedErrorResponse } from "./errors";

export type RouteHandler<Ctx = unknown> = (req: Request, ctx: Ctx) => Promise<Response> | Response;

function randomId(): string {
	return Math.random().toString(36).slice(2, 10);
}

export function withApi<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
	return async (req, ctx) => {
		const requestId = req.headers.get("x-request-id") ?? randomId();
		const start = Date.now();
		const log = logger.child({
			requestId,
			path: new URL(req.url).pathname,
			method: req.method,
		});
		try {
			const res = await handler(req, ctx);
			const duration = Date.now() - start;
			log.info({ status: res.status, duration }, "request");
			if (res instanceof NextResponse) res.headers.set("x-request-id", requestId);
			return res;
		} catch (err) {
			const duration = Date.now() - start;
			if (err instanceof ApiError) {
				log.warn(
					{ status: err.status, code: err.code, duration, message: err.message },
					"api-error"
				);
				const res = apiErrorResponse(err);
				res.headers.set("x-request-id", requestId);
				return res;
			}
			log.error({ err, duration }, "unhandled-error");
			const res = unexpectedErrorResponse();
			res.headers.set("x-request-id", requestId);
			return res;
		}
	};
}
