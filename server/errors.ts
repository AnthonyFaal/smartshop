import { TRPCError } from "@trpc/server";

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
    return new TRPCError({
      code: error.code,
      message: error.message?.trim() || getFriendlyMessageFromTRPCCode(error.code),
      cause: undefined,
    });
  }

  console.error("[Unhandled Error]", error);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong. Please try again.",
  });
}


export const Errors = {
  unauthorized: () =>
    new AppError("Authentication required", "UNAUTHORIZED", 401),
  forbidden: (msg = "Access denied") =>
    new AppError(msg, "FORBIDDEN", 403),
  notFound: (entity: string) =>
    new AppError(`${entity} not found`, "NOT_FOUND", 404),
  conflict: (msg: string) => new AppError(msg, "CONFLICT", 409),
  badRequest: (msg: string, details?: Record<string, unknown>) =>
    new AppError(msg, "BAD_REQUEST", 400, details),
  rateLimited: () =>
    new AppError("Too many requests", "RATE_LIMITED", 429),
  subscriptionLimit: (msg: string) =>
    new AppError(msg, "SUBSCRIPTION_LIMIT", 403),
};
