"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />
        <p className="text-xs text-zinc-500">
          At least 8 characters with uppercase, lowercase, and a number.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
