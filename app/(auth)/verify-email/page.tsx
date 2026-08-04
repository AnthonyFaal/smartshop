"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-[60vh] items-center justify-center">Loading...</main>}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const search = useSearchParams();
  const emailParam = search.get("email") ?? "";
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const verify = trpc.auth.verifyEmailOtp.useMutation({
    onSuccess: () => {
      toast.success("Email verified — you can now sign in.");
      router.push(`/login?email=${encodeURIComponent(email)}`);
    },
    onError: (err) => {
      toast.error(err.message || "Verification failed");
      setIsLoading(false);
    },
  });

  const resend = trpc.auth.resendEmailVerification.useMutation({
    onSuccess: () => toast.success("Verification code resent."),
    onError: () => toast.error("Failed to resend code."),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    verify.mutate({ email, code });
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Verify your email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm text-zinc-700">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </div>
              <div>
                <label className="block text-sm text-zinc-700">Verification code</label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </form>

            <div className="mt-4 flex justify-between">
              <Button variant="ghost" onClick={() => resend.mutate({ email })}>Resend code</Button>
              <Button variant="link" onClick={() => router.push("/register")}>Create account</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
