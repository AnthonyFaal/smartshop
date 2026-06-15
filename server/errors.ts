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
    return new TRPCError({
      code: codeMap[error.statusCode] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error.details,
    });
  }

  if (error instanceof TRPCError) return error;

  console.error("[Unhandled Error]", error);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
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
