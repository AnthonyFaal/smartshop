import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { Errors, toTRPCError } from "@/server/errors";
import { getUserMessage } from "@/lib/errors/user-message";

describe("production error contract", () => {
  it("returns a neutral 401 for invalid credentials", () => {
    const error = toTRPCError(Errors.invalidCredentials());

    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Email or password is incorrect.");
  });

  it("uses 503 when a required dependency is unavailable", () => {
    const error = Errors.serviceUnavailable();

    expect(error.statusCode).toBe(503);
    expect(error.message).toBe("This service is temporarily unavailable. Please try again.");
  });

  it("gives direct tRPC authorization errors a human message", () => {
    const error = toTRPCError(new TRPCError({ code: "UNAUTHORIZED" }));

    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Please log in to continue.");
  });

  it("does not expose an unexpected error to the browser", () => {
    expect(getUserMessage(new Error("connection string leaked"))).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("keeps reviewed tRPC messages for expected errors", () => {
    expect(
      getUserMessage({
        message: "Only available settlements can be marked paid.",
        data: { code: "BAD_REQUEST" },
      })
    ).toBe("Only available settlements can be marked paid.");
  });
});
