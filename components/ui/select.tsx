import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative w-full min-w-0">
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full min-w-0 appearance-none truncate rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-10 text-sm text-zinc-900 shadow-sm transition-colors outline-none hover:bg-zinc-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
    />
  </div>
));

Select.displayName = "Select";

export { Select };
