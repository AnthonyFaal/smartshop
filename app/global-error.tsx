"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";
export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { reportError(error, { digest: error.digest, global: true }); }, [error]);
  return <html><body><main><h1>Something went wrong</h1><button onClick={() => unstable_retry()}>Try again</button></main></body></html>;
}
