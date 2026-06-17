"use client";

import Link from "next/link";
import { ShieldCheck, Camera, MapPin, CreditCard } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { trpc } from "@/lib/trpc/client";
import { useInitialAuthUser } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    icon: ShieldCheck,
    title: "Phone verified",
    description: "Confirm your Ghana mobile number in account settings.",
    href: "/settings",
  },
  {
    icon: CreditCard,
    title: "Ghana Card",
    description: "Upload a clear photo of your Ghana Card (front).",
  },
  {
    icon: Camera,
    title: "Selfie check",
    description: "Take a live selfie to match your Ghana Card photo.",
  },
  {
    icon: MapPin,
    title: "Campus location",
    description: "Confirm you are within the UMaT pilot delivery zone.",
  },
];

export default function SellerVerifyPage() {
  const initialUser = useInitialAuthUser();
  const { data: user } = trpc.auth.me.useQuery(undefined, {
    initialData: initialUser ?? undefined,
    staleTime: 60_000,
  });

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-zinc-900">Become a seller</h1>
          <p className="mt-3 text-zinc-600">
            Create an account to start selling on SmartShop.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login?redirect=/seller/verify">Sign in</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (user.role === "SELLER" || user.role === "ADMIN") {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-zinc-900">You&apos;re already a seller</h1>
          <p className="mt-3 text-zinc-600">Head to your dashboard to manage listings.</p>
          <Button className="mt-8" asChild>
            <Link href="/seller">Seller Dashboard</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showVerificationBanner>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-zinc-900">Seller verification</h1>
        <p className="mt-2 text-zinc-600">
          Complete these steps to sell on SmartShop. Verification protects buyers and
          builds your trust score.
        </p>

        <div className="mt-8 space-y-4">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <step.icon className="h-5 w-5 text-emerald-600" />
                  {step.title}
                  {step.title === "Phone verified" && user.phoneVerified && (
                    <span className="ml-auto text-xs font-normal text-emerald-600">Done</span>
                  )}
                </CardTitle>
                <CardDescription className="pl-11">{step.description}</CardDescription>
              </CardHeader>
              {step.href && !user.phoneVerified && (
                <CardContent className="pl-11 pt-0">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={step.href}>Verify phone</Link>
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          Document upload and admin review will be enabled in the next pilot update.
          By applying, you agree to our{" "}
          <Link href="/terms" className="text-emerald-600 hover:underline">Terms of Service</Link>.
        </div>
      </div>
    </PageShell>
  );
}
