import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "@/components/ui/password-input";

describe("PasswordInput", () => {
  it("lets a user reveal and hide their password without changing its value", () => {
    render(<PasswordInput aria-label="Password" defaultValue="SafePass123" />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("SafePass123");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
