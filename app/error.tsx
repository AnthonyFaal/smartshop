"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";
export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { reportError(error, { digest: error.digest }); }, [error]);
  return <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="mt-2 text-zinc-600">We could not load this page. Please try again.</p><button className="mt-6 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white" onClick={() => unstable_retry()}>Try again</button></main>;
}
