import { createContext, useContext } from "react";
import type { AadhaarStatus, AuthResult, User } from "@/types/api";

export interface AuthContextValue {
  user: User | null;
  aadhaar: AadhaarStatus | null;
  /** True until the stored session has been checked on startup. */
  loading: boolean;
  /** Save tokens + user from a login/registration response. */
  signIn: (result: AuthResult) => void;
  signOut: () => Promise<void>;
  /** Reload user and Aadhaar status from GET /auth/me. */
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
