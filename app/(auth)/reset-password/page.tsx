"use client";

import { useEffect, useState } from "react";


import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

const schema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6, "Enter the 6-digit code"),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
    },
  });

  useEffect(() => {
    const emailFromQuery = searchParams.get("email") ?? "";
    if (emailFromQuery) setValue("email", emailFromQuery, { shouldValidate: false });
  }, [searchParams, setValue]);

  const watchEmail = watch("email");





  const resendResetCode = trpc.auth.resendResetCode.useMutation({
    onSuccess: (data) => {
      toast.success("A new reset code was sent");
      setNextAllowedAt((data as { nextAllowedAt: number }).nextAllowedAt);
    },
    onError: (error) => {
    toast.error(error.message);
  },
  });

  const [nextAllowedAt, setNextAllowedAt] = useState<number>(Date.now());
  const [nowTick, setNowTick] = useState<number>(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsLeft = Math.max(
    0,
    Math.ceil((nextAllowedAt - nowTick) / 1000)
  );


  const canResend = secondsLeft <= 0 && !resendResetCode.isPending;

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated. You can sign in now.");
      router.push("/login");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const onSubmit = (data: FormData) => {
    setIsLoading(true);
    resetPassword.mutate({
      email: data.email,
      code: data.code,
      password: data.password,
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set new password</CardTitle>
            <CardDescription>
              Enter the code from your email and choose a new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-red-600" role="alert">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Reset code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  {...register("code")}
                />
                {errors.code && (
                  <p className="text-sm text-red-600" role="alert">{errors.code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                {errors.password && (
                  <p className="text-sm text-red-600" role="alert">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600" role="alert">{errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </form>
            <div className="mt-6 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-center text-sm text-zinc-600">
                Didn&apos;t get the code? You can request a new one.
              </p>

              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={!canResend || !watchEmail}
                  onClick={() =>
                    resendResetCode.mutate({
                      email: watchEmail!,
                    })
                  }
                >
                  {resendResetCode.isPending
                    ? "Sending..."
                    : secondsLeft > 0
                      ? `Resend in ${secondsLeft}s`
                      : "Resend code"}
                </Button>

                <div className="text-xs text-zinc-500" aria-live="polite">
                  {secondsLeft > 0 ? `Please wait ${secondsLeft} seconds.` : "You can resend now."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
