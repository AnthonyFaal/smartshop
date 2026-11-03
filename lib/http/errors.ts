import { NextResponse } from "next/server";
import { isAppError } from "@/server/errors";
import { reportError } from "@/lib/monitoring";

/** Return expected AppErrors verbatim and mask unexpected operational errors. */
export function apiErrorResponse(
  error: unknown,
  context: string,
  fallback = "Something went wrong. Please try again."
) {
  if (isAppError(error)) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }

  reportError(error, { boundary: "route-handler", context });
  return NextResponse.json({ error: fallback, code: "INTERNAL_SERVER_ERROR" }, { status: 500 });
}
