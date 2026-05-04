"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { isAuthConfigured } from "@/lib/auth";

interface AuthGuardProps {
  children: ReactNode;
  requiredPermissions?: string[];
}

export function AuthGuard({ children, requiredPermissions }: AuthGuardProps) {
  const { user, isLoading, isLoggedIn, login } = useAuth();

  // If auth is not configured (local dev without Cognito), show content
  if (!isAuthConfigured()) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    login();
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
        </div>
      </main>
    );
  }

  // Check permissions if required
  if (requiredPermissions && requiredPermissions.length > 0 && user) {
    const hasAllPermissions = requiredPermissions.every((p) => user.permissions.includes(p));
    if (!hasAllPermissions) {
      return (
        <main className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
            <h1 className="mb-2 text-lg font-semibold text-amber-800 dark:text-amber-200">Access Denied</h1>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You don&apos;t have permission to access this page.
            </p>
          </div>
        </main>
      );
    }
  }

  return <>{children}</>;
}
