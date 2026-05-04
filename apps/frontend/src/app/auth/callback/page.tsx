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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous early-return for error display
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

        // Fetch and store the user session (use id_token which has email claim)
        const session = await fetchSession(tokens.id_token);
        storeSession(session);

        router.replace("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    })();
  }, [searchParams, router]);

  if (error) {
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
          <div className="auth-error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <h2>Authentication Error</h2>
            <p>{error}</p>
            <a href="/auth/login" className="auth-btn">
              Try again
            </a>
          </div>
        </div>
      </main>
    );
  }

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
        <div className="auth-spinner-wrap">
          <div className="auth-spinner" />
          <p className="auth-message">Signing you in...</p>
        </div>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
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
            <div className="auth-spinner-wrap">
              <div className="auth-spinner" />
              <p className="auth-message">Loading...</p>
            </div>
          </div>
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
