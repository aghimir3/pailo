"use client";

import { useEffect } from "react";
import { getLoginUrl, isAuthConfigured } from "@/lib/auth";

export default function AuthLoginPage() {
  useEffect(() => {
    if (isAuthConfigured()) {
      window.location.href = getLoginUrl();
    }
  }, []);

  if (!isAuthConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold">Auth Not Configured</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cognito domain and client ID environment variables are not set.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
      </div>
    </main>
  );
}
