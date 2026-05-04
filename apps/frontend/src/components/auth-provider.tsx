"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  clearAuth,
  fetchSession,
  getAccessToken,
  getLoginUrl,
  getLogoutUrl,
  getStoredSession,
  isAuthConfigured,
  isAuthenticated,
  storeSession,
  type UserSession,
} from "@/lib/auth";

interface AuthContextValue {
  user: UserSession | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    if (!isAuthConfigured()) {
      setIsLoading(false);
      return;
    }

    if (!isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Try stored session first for fast load
    const stored = getStoredSession();
    if (stored) {
      setUser(stored);
      setIsLoading(false);
    }

    // Validate with backend
    try {
      const token = await getAccessToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const session = await fetchSession(token);
      storeSession(session);
      setUser(session);
    } catch {
      clearAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session init on mount
    loadSession();
  }, [loadSession]);

  const login = useCallback(() => {
    window.location.href = getLoginUrl();
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    window.location.href = getLogoutUrl();
  }, []);

  const refreshSession = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const session = await fetchSession(token);
      storeSession(session);
      setUser(session);
    } catch {
      clearAuth();
      setUser(null);
    }
  }, []);

  const getToken = useCallback(async () => {
    return getAccessToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: user !== null,
        login,
        logout,
        refreshSession,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
