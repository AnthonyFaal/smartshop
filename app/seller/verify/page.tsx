"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Camera,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Lock,
  Clock3,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    key: "phone",
    icon: ShieldCheck,
    title: "Phone verification",
    description:
      "Confirm your Ghana mobile number to secure your seller account.",
    href: "/settings",
  },
  {
    key: "ghanaCard",
    icon: CreditCard,
    title: "Ghana Card",
    description:
      "Upload a clear front image of your Ghana Card for identity verification.",
    href: "/seller/verify/ghana-card",
  },
  {
    key: "selfie",
    icon: Camera,
    title: "Selfie verification",
    description:
      "Take a live selfie to match your Ghana Card photo.",
    href: "/seller/verify/selfie",
  },
  
];

export default function SellerVerifyPage() {
  const { data: user } = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Lock className="mx-auto h-12 w-12 text-zinc-400" />

          <h1 className="mt-5 text-2xl font-bold">
            Become a seller
          </h1>

          <p className="mt-3 text-zinc-600">
            Create an account to start selling on SmartShop.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Button asChild>
              <Link href="/register">
                Create account
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/login?redirect=/seller/verify">
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }


  if (user.role === "SELLER" || user.role === "ADMIN") {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">

          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />

          <h1 className="mt-5 text-2xl font-bold">
            You&apos;re already a seller
          </h1>

          <p className="mt-3 text-zinc-600">
            Manage your products from your seller dashboard.
          </p>

          <Button className="mt-8" asChild>
            <Link href="/seller">
              Seller Dashboard
            </Link>
          </Button>

        </div>
      </PageShell>
    );
  }


  const verification = user.sellerVerification;

  const status = {
    phone: user.phoneVerified,
    ghanaCard: Boolean(verification?.ghanaCardFrontUrl),
    selfie: Boolean(verification?.selfieUrl),
  };

  const completed = Object.values(status).filter(Boolean).length;
  const progress = Math.round((completed / steps.length) * 100);
  const allCompleted = completed === steps.length;

  const verificationStatus = verification?.status;
  const statusLabel =
    verificationStatus === "APPROVED"
      ? "Approved"
      : verificationStatus === "UNDER_REVIEW"
        ? "Under review"
        : verificationStatus === "REJECTED"
          ? "Needs attention"
          : "Submitted";

  return (
    <PageShell showVerificationBanner>

      <div className="mx-auto max-w-3xl px-4 py-10">



        {/* Header */}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex items-start justify-between gap-4">

            <div>

              <h1 className="text-2xl font-bold">
                Seller verification
              </h1>

              <p className="mt-2 text-sm text-zinc-600">
                Complete verification to unlock selling features.
              </p>

            </div>


            <div className="rounded-xl bg-emerald-50 px-4 py-2 text-center">

              <p className="text-xs text-emerald-700">
                Progress
              </p>

              <p className="text-lg font-bold text-emerald-700">
                {progress}%
              </p>

            </div>

          </div>


          <div className="mt-5 h-2 rounded-full bg-zinc-100">

            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>




        {allCompleted && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-emerald-800">
                  Verification submitted
                </h2>

                <p className="mt-1 text-sm text-emerald-700">
                  You&apos;ve completed all required steps. Your application is
                  now waiting for review.
                </p>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-emerald-800">
                  <Clock3 className="h-4 w-4" />
                  <span>Current status: {statusLabel}</span>
                </div>

                <p className="mt-3 text-sm text-emerald-700">
                  What happens next: our team will review your documents and
                  either approve your seller account or ask for changes. You
                  will be notified by email or phone once there is an update.
                </p>

                <p className="mt-2 text-sm text-emerald-700">
                  You do not need to do anything else right now. You can close
                  this page and come back later to check your status.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Steps */}

        <div className="mt-6 space-y-4">

          {steps.map((step, index)=>{

            const done =
              status[step.key as keyof typeof status];

            const Icon = step.icon;


            return (
              <Card
                key={step.key}
                className="transition hover:shadow-md"
              >

                <CardHeader>

                  <div className="flex items-start gap-4">


                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        done
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600"
                      }`}
                    >

                      {done ? (
                        <CheckCircle2 />
                      ) : (
                        <Icon />
                      )}

                    </div>



                    <div className="flex-1">

                      <CardTitle className="flex items-center justify-between text-base">

                        <span>
                          {index + 1}. {step.title}
                        </span>


                        {done && (
                          <span className="text-xs font-medium text-emerald-600">
                            Completed
                          </span>
                        )}

                      </CardTitle>


                      <CardDescription className="mt-1">
                        {step.description}
                      </CardDescription>

                    </div>

                  </div>

                </CardHeader>



                {!done && (

                  <CardContent>

                    <Button
                      asChild
                      size="sm"
                    >

                      <Link href={step.href}>

                        Continue

                        <ArrowRight className="ml-2 h-4 w-4"/>

                      </Link>

                    </Button>

                  </CardContent>

                )}


              </Card>
            );

          })}

        </div>



        <div className="mt-8 rounded-xl border bg-zinc-50 p-5 text-sm text-zinc-600">

          Your documents are securely reviewed before seller access is granted.
          By applying, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-emerald-600 hover:underline"
          >
            Terms of Service
          </Link>.

        </div>


      </div>

    </PageShell>
  );
}