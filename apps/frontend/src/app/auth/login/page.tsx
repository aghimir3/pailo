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
          <div className="auth-denied">
            <h2>Auth Not Configured</h2>
            <p>Cognito domain and client ID environment variables are not set.</p>
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
          <p className="auth-message">Redirecting to sign in...</p>
        </div>
      </div>
    </main>
  );
}
