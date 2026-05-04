"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { isAuthConfigured } from "@/lib/auth";

interface AuthGuardProps {
  children: ReactNode;
  requiredPermissions?: string[];
}

function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="auth-gate">
      <div className="auth-gate-bg" />
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">P</span>
          <span className="auth-brand-text">
            <strong>Pailo</strong>
            <small>Factory OS</small>
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

function AuthSpinner({ message }: { message: string }) {
  return (
    <AuthScreen>
      <div className="auth-spinner-wrap">
        <div className="auth-spinner" />
        <p className="auth-message">{message}</p>
      </div>
    </AuthScreen>
  );
}

export function AuthGuard({ children, requiredPermissions }: AuthGuardProps) {
  const { user, isLoading, isLoggedIn, login } = useAuth();

  // If auth is not configured (local dev without Cognito), show content
  if (!isAuthConfigured()) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <AuthSpinner message="Loading your session..." />;
  }

  if (!isLoggedIn) {
    login();
    return <AuthSpinner message="Redirecting to sign in..." />;
  }

  // Check permissions if required
  if (requiredPermissions && requiredPermissions.length > 0 && user) {
    const hasAllPermissions = requiredPermissions.every((p) => user.permissions.includes(p));
    if (!hasAllPermissions) {
      return (
        <AuthScreen>
          <div className="auth-denied">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m4.93 4.93 14.14 14.14" />
            </svg>
            <h2>Access Denied</h2>
            <p>You don&apos;t have permission to access this page.</p>
          </div>
        </AuthScreen>
      );
    }
  }

  return <>{children}</>;
}
