"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "@/lib/auth/get-auth-user";

const AuthInitialContext = createContext<AuthUser | null | undefined>(undefined);

export function AuthInitialProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  return (
    <AuthInitialContext.Provider value={initialUser}>
      {children}
    </AuthInitialContext.Provider>
  );
}

export function useInitialAuthUser() {
  return useContext(AuthInitialContext);
}
