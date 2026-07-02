"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .regex(/^\+233[0-9]{9}$/, "Use Ghana format: +233XXXXXXXXX")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[0-9]/, "Include a number"),
  acceptTerms: z.boolean().refine((v) => v, {
    message: "You must accept the Terms of Service",
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: false },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success("Account created successfully!");

      const email = data.email ?? "";
      const isEmailVerified = Boolean(data.emailVerified);

      // If email is not verified yet, force the user into the verify-email flow.
      if (!isEmailVerified) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      if (data.phone && !data.phoneVerified) {
        router.push("/settings");
      } else {
        router.push("/marketplace");
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const onSubmit = (data: RegisterForm) => {
    setIsLoading(true);
    registerMutation.mutate({
      ...data,
      phone: data.phone || undefined,
      acceptTerms: true,
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>
              Join SmartShop — buy and sell on Ghana&apos;s trusted marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" {...register("firstName")} aria-invalid={!!errors.firstName} />
                  {errors.firstName && (
                    <p className="text-sm text-red-600" role="alert">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" {...register("lastName")} aria-invalid={!!errors.lastName} />
                  {errors.lastName && (
                    <p className="text-sm text-red-600" role="alert">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && (
                  <p className="text-sm text-red-600" role="alert">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (recommended)</Label>
                <Input id="phone" type="tel" placeholder="+233XXXXXXXXX" {...register("phone")} />
                {errors.phone && (
                  <p className="text-sm text-red-600" role="alert">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} />
                {errors.password && (
                  <p className="text-sm text-red-600" role="alert">{errors.password.message}</p>
                )}
              </div>
              <div className="flex items-start gap-2">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-zinc-300"
                  {...register("acceptTerms")}
                />
                <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug text-zinc-600">
                  I agree to the{" "}
                  <Link href="/terms" className="text-emerald-600 hover:underline" target="_blank">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-emerald-600 hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-red-600" role="alert">{errors.acceptTerms.message}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-emerald-600 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
