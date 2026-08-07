"use client";

import { LogOut, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { PhoneVerification } from "@/components/auth/phone-verification";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { trpc } from "@/lib/trpc/client";
import { useAuthUser } from "@/components/providers/auth-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const router = useRouter();
  const { user: contextUser, updateAuthUser } = useAuthUser();
  const { data: queriedUser } = trpc.auth.me.useQuery();
  const user = queriedUser ?? contextUser ?? null;
  const utils = trpc.useUtils();

  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      // Immediately update client-side header state.
      updateAuthUser(null);
      await utils.auth.me.invalidate();
      toast.success("Signed out");
      router.push("/");
    },
    onError: (error) => toast.error(error.message),
  });


  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="text-zinc-600">Please sign in to manage your account.</p>
          <Button className="mt-4" onClick={() => router.push("/login?redirect=/settings")}>
            Sign in
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showVerificationBanner>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Account settings</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage verification, security, and your profile
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Name</span>
                <span className="font-medium">
                  {user.profile?.firstName} {user.profile?.lastName}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Email</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Role</span>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Trust score</span>
                <span className="font-medium">{user.trustScore?.score ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Phone verification
              </CardTitle>
              <CardDescription>
                Required for checkout, seller applications, and dispute protection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhoneVerification
                currentPhone={user.phone}
                phoneVerified={user.phoneVerified}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Password</CardTitle>
              <CardDescription>Update your sign-in password</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
