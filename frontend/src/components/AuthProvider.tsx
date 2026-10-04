import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, SESSION_EXPIRED_EVENT, tokenStore } from "@/lib/api";
import { AuthContext } from "@/lib/auth";
import type { AadhaarStatus, AuthResult, User } from "@/types/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [aadhaar, setAadhaar] = useState<AadhaarStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(tokenStore.refresh));

  const clear = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setAadhaar(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await api.me();
    setUser(me.user);
    setAadhaar(me.aadhaar);
  }, []);

  // Restore the session saved from a previous visit
  useEffect(() => {
    if (!tokenStore.refresh) return;
    refreshMe()
      .catch(clear)
      .finally(() => setLoading(false));
  }, [refreshMe, clear]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, clear);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, clear);
  }, [clear]);

  const signIn = useCallback((result: AuthResult) => {
    tokenStore.save(result.tokens);
    setUser(result.user);
    setAadhaar(result.aadhaar ?? { status: "not_started", isVerified: false, aadhaarMasked: null });
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    clear();
    if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
  }, [clear]);

  const value = useMemo(
    () => ({ user, aadhaar, loading, signIn, signOut, refreshMe }),
    [user, aadhaar, loading, signIn, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
