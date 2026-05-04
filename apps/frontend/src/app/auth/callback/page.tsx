"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens, fetchSession, storeSession, storeTokens } from "@/lib/auth";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!code) {
      setError("No authorization code received");
      return;
    }

    (async () => {
      try {
        const tokens = await exchangeCodeForTokens(code);
        storeTokens(tokens);

        // Fetch and store the user session
        const session = await fetchSession(tokens.access_token);
        storeSession(session);

        router.replace("/portal");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    })();
  }, [searchParams, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <h1 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">Authentication Error</h1>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <a href="/auth/login" className="mt-4 inline-block text-sm underline">
            Try again
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Signing you in...</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
