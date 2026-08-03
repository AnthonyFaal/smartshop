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
  const v =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : 0;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${v} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, idx) => {
        const starValue = idx + 1;

        const full = v >= starValue;
        const half = v >= starValue - 0.5 && v < starValue;

        return (
          <div
            key={idx}
            className="relative"
            style={{ width: size, height: size }}
          >
            {/* Empty star */}
            <Star
              className="absolute text-amber-300"
              style={{
                width: size,
                height: size,
              }}
              aria-hidden
            />

            {/* Filled star */}
            {(full || half) && (
              <Star
                className="absolute fill-amber-500 text-amber-500"
                style={{
                  width: size,
                  height: size,
                  clipPath: half
                    ? "inset(0 50% 0 0)"
                    : undefined,
                }}
                aria-hidden
              />
            )}
          </div>
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
  size = 22,
}: StarPickerProps) {
  const current =
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Select rating"
    >
      {Array.from({ length: 5 }).map((_, idx) => {
        const starValue = idx + 1;

        const full = current >= starValue;
        const half = current >= starValue - 0.5 && current < starValue;

        return (
          <div
            key={idx}
            className="relative cursor-pointer"
            style={{ width: size, height: size }}
          >
            {/* Left half */}
            <button
              type="button"
              disabled={disabled}
              aria-label={`${starValue - 0.5} stars`}
              className="absolute left-0 top-0 z-10 h-full w-1/2"
              onClick={() => onChange(starValue - 0.5)}
            />

            {/* Right half */}
            <button
              type="button"
              disabled={disabled}
              aria-label={`${starValue} stars`}
              className="absolute right-0 top-0 z-10 h-full w-1/2"
              onClick={() => onChange(starValue)}
            />

            <Star
              className={cn(
                "absolute inset-0 transition-colors",
                full
                  ? "fill-amber-500 text-amber-500"
                  : half
                  ? "fill-amber-500 text-amber-500"
                  : "text-amber-300"
              )}
              style={{
                width: size,
                height: size,
                clipPath: half
                  ? "inset(0 50% 0 0)"
                  : undefined,
              }}
              aria-hidden
            />

            {half && (
              <Star
                className="absolute inset-0 text-amber-300"
                style={{
                  width: size,
                  height: size,
                }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
