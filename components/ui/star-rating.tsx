"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type StarRatingProps = {
  value: number | null | undefined;
  className?: string;
  size?: number;
};

export function StarRating({ value, className, size = 16 }: StarRatingProps) {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;

  // Since backend stores integer per review, we show average using simple fill threshold.
  // This avoids half-star complexity while still being visually meaningful.
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label="Rating">
      {Array.from({ length: 5 }).map((_, idx) => {
        const starNumber = idx + 1; // 1..5
        const isFilled = v >= starNumber - 0.25; // slight threshold for averages
        return (
          <Star
            key={idx}
            className={cn(
              "transition-colors",
              isFilled ? "fill-amber-500 text-amber-500" : "text-amber-300"
            )}
            style={{ width: size, height: size }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

type StarPickerProps = {
  value: number | null | undefined;
  onChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
  size?: number;
};

export function StarPicker({
  value,
  onChange,
  disabled,
  className,
  size = 18,
}: StarPickerProps) {
  const current = typeof value === "number" && Number.isFinite(value) ? value : 0;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Select rating"
    >
      {Array.from({ length: 5 }).map((_, idx) => {
        const starNumber = idx + 1; // 1..5
        const selected = starNumber <= current;

        return (
          <button
            key={idx}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
            onClick={() => {
              if (disabled) return;
              onChange(starNumber);
            }}
          >
            <Star
              className={cn(
                "transition-colors",
                selected
                  ? "fill-amber-500 text-amber-500"
                  : "text-amber-300"
              )}
              style={{ width: size, height: size }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
