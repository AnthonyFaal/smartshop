"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpPurpose } from "@prisma/client";

interface PhoneVerificationProps {
  currentPhone?: string | null;
  phoneVerified?: boolean;
}

export function PhoneVerification({
  currentPhone,
  phoneVerified,
}: PhoneVerificationProps) {
  const utils = trpc.useUtils();
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");

  const sendOtp = trpc.auth.sendOtp.useMutation({
    onSuccess: () => {
      setStep("code");
      toast.success("Verification code sent. Check your phone or server logs in dev.");
    },
    onError: (error) => toast.error(error.message),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Phone number verified!");
      setStep("phone");
      setCode("");
    },
    onError: (error) => toast.error(error.message),
  });

  if (phoneVerified) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-800">Phone verified</p>
        <p className="mt-1 text-sm text-emerald-700">{currentPhone}</p>
      </div>
    );
  }

  const isPending = sendOtp.isPending || verifyOtp.isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="verify-phone">Ghana phone number</Label>
        <Input
          id="verify-phone"
          type="tel"
          placeholder="+233XXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={step === "code" || isPending}
        />
        <p className="text-xs text-zinc-500">
          Format: +233 followed by 9 digits (e.g. +233241234567)
        </p>
      </div>

      {step === "code" && (
        <div className="space-y-2">
          <Label htmlFor="verify-code">6-digit code</Label>
          <Input
            id="verify-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            disabled={isPending}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {step === "phone" ? (
          <Button
            type="button"
            onClick={() =>
              sendOtp.mutate({ phone, purpose: OtpPurpose.PHONE_VERIFICATION })
            }
            disabled={isPending || !phone.match(/^\+233[0-9]{9}$/)}
          >
            {sendOtp.isPending ? "Sending..." : "Send verification code"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              onClick={() =>
                verifyOtp.mutate({
                  phone,
                  code,
                  purpose: OtpPurpose.PHONE_VERIFICATION,
                })
              }
              disabled={isPending || code.length !== 6}
            >
              {verifyOtp.isPending ? "Verifying..." : "Verify code"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("phone");
                setCode("");
              }}
              disabled={isPending}
            >
              Change number
            </Button>
          </>
        )}
      </div>
    </div>
  );
}