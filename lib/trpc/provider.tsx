"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc/client";
import type { AuthUser } from "@/lib/auth/get-auth-user";
import { AuthInitialProvider } from "@/components/providers/auth-provider";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.APP_URL) return process.env.APP_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({
  children,
  initialAuthUser = null,
}: {
  children: React.ReactNode;
  initialAuthUser?: AuthUser | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    })
  );

  return (
    <AuthInitialProvider initialUser={initialAuthUser ?? null}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </AuthInitialProvider>
  );
}
