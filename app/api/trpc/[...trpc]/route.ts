import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/context";

// tRPC procedures are addressed beneath /api/trpc (for example
// /api/trpc/auth.login). A catch-all segment is required so the Next.js route
// handler consistently receives every procedure path in dev and production.
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC Error on ${path}:`, error.message);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
