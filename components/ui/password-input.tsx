"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

/** A consistent, accessible password visibility control for every account flow. */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const toggleLabel = isVisible ? "Hide password" : "Show password";

    return (
      <div className="relative">
        <input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-11 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          aria-label={toggleLabel}
          aria-pressed={isVisible}
          title={toggleLabel}
          disabled={disabled}
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-lg text-zinc-500 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset disabled:cursor-not-allowed"
        >
          {isVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
