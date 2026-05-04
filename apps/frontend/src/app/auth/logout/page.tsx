"use client";

import { useEffect } from "react";
import { clearAuth } from "@/lib/auth";

export default function AuthLogoutPage() {
  useEffect(() => {
    clearAuth();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold">Signed Out</h1>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          You have been signed out of Pailo.
        </p>
        <a
          href="/auth/login"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in again
        </a>
      </div>
    </main>
  );
}
