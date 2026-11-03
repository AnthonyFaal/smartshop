/**
 * A final client-side guardrail. Server AppErrors have already been reviewed
 * for user-safe wording; unknown/network errors must never expose internals.
 */
const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

type ErrorLike = {
  message?: unknown;
  data?: { code?: unknown };
};

const SAFE_TRPC_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
]);

export function getUserMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (!error || typeof error !== "object") return fallback;

  const { message, data } = error as ErrorLike;
  if (
    typeof message === "string" &&
    message.trim() &&
    typeof data?.code === "string" &&
    SAFE_TRPC_CODES.has(data.code)
  ) {
    return message;
  }

  return fallback;
}

export { FALLBACK_MESSAGE };
