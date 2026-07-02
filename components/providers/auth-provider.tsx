"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth/get-auth-user";

type AuthContextValue = {
  user: AuthUser | null;
  updateAuthUser: (next: AuthUser | null) => void;
};

const AuthInitialContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthInitialProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      updateAuthUser: setUser,
    }),
    [user]
  );

  return <AuthInitialContext.Provider value={value}>{children}</AuthInitialContext.Provider>;
}

export function useInitialAuthUser() {
  const ctx = useContext(AuthInitialContext);
  return ctx?.user;
}

export function useAuthUser() {
  const ctx = useContext(AuthInitialContext);
  if (!ctx) throw new Error("useAuthUser must be used within AuthInitialProvider");
  return ctx;
}

