"use client";

import { useEffect } from "react";
import { clearAuth } from "@/lib/auth";

export default function AuthLogoutPage() {
  useEffect(() => {
    clearAuth();
  }, []);

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
        <div className="auth-signedout">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          <h2>Signed Out</h2>
          <p>You have been signed out of Pailo.</p>
          <a href="/auth/login" className="auth-btn">
            Sign in again
          </a>
        </div>
      </div>
    </main>
  );
}
