import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/auth/password";

describe("password utilities", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("SecurePass1");
    expect(hash).not.toBe("SecurePass1");
    expect(await verifyPassword("SecurePass1", hash)).toBe(true);
    expect(await verifyPassword("WrongPass1", hash)).toBe(false);
  });

  it("validates password strength", () => {
    const weak = validatePasswordStrength("short");
    expect(weak.valid).toBe(false);
    expect(weak.errors.length).toBeGreaterThan(0);

    const strong = validatePasswordStrength("SecurePass1");
    expect(strong.valid).toBe(true);
    expect(strong.errors).toHaveLength(0);
  });
});
