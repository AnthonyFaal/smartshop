import { TRPCError } from "@trpc/server";
import { reportError } from "@/lib/monitoring";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Errors deliberately raised for an expected product flow. Their messages are
 * safe to show to a customer; unexpected errors are always replaced with a
 * generic message before crossing an API boundary.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function getFriendlyMessageFromTRPCCode(code: TRPCError["code"]): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Please log in to continue.";
    case "FORBIDDEN":
      return "You don’t have permission to perform this action.";
    case "NOT_FOUND":
      return "We couldn’t find what you’re looking for.";
    case "CONFLICT":
      return "This request can’t be completed due to a conflict. Try again.";
    case "TOO_MANY_REQUESTS":
      return "Too many requests. Please try again in a moment.";
    case "BAD_REQUEST":
      return "Please check your input and try again.";
    case "INTERNAL_SERVER_ERROR":
    default:
      return "Something went wrong. Please try again.";
  }
}

export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof AppError) {
    const codeMap: Record<number, TRPCError["code"]> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
    };

    const code = codeMap[error.statusCode] ?? "INTERNAL_SERVER_ERROR";

    // Production-safe: never leak internal/debug info to the client.
    // AppError.message is already intended to be user-facing; keep it,
    // but fall back to a stable friendly message if empty.
    const message = error.message?.trim() || getFriendlyMessageFromTRPCCode(code);

    return new TRPCError({
      code,
      message,
      // Keep internal cause out of client-visible messages,
      // but preserve it server-side for debugging/logging.
      cause: error.details,

    });
  }

  if (error instanceof TRPCError) {
    const message = error.message?.trim();
    return new TRPCError({
      code: error.code,
      message:
        !message || message === error.code
          ? getFriendlyMessageFromTRPCCode(error.code)
          : message,
      cause: undefined,
    });
  }

  reportError(error, { boundary: "trpc" });
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong. Please try again.",
  });
}


export const Errors = {
  /** Use only when a signed-in session is required. */
  authenticationRequired: () =>
    new AppError("Please sign in to continue.", "UNAUTHORIZED", 401),
  /** Do not reveal whether an account exists or which credential was wrong. */
  invalidCredentials: () =>
    new AppError("Email or password is incorrect.", "UNAUTHORIZED", 401),
  // Kept as a compatibility alias while call sites migrate to the precise name.
  unauthorized: () =>
    new AppError("Please sign in to continue.", "UNAUTHORIZED", 401),
  forbidden: (msg = "You don’t have permission to perform this action.") =>
    new AppError(msg, "FORBIDDEN", 403),
  notFound: (entity: string) =>
    new AppError(`${entity} not found`, "NOT_FOUND", 404),
  conflict: (msg: string) => new AppError(msg, "CONFLICT", 409),
  badRequest: (msg: string, details?: Record<string, unknown>) =>
    new AppError(msg, "BAD_REQUEST", 400, details),
  rateLimited: () =>
    new AppError("Too many requests. Please try again in a moment.", "RATE_LIMITED", 429),
  serviceUnavailable: (msg = "This service is temporarily unavailable. Please try again.") =>
    new AppError(msg, "SERVICE_UNAVAILABLE", 503),
  subscriptionLimit: (msg: string) =>
    new AppError(msg, "SUBSCRIPTION_LIMIT", 403),
};
