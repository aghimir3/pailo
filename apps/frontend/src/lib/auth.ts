/**
 * Cognito auth utilities for Pailo frontend.
 * Uses Authorization Code flow with Cognito Hosted UI.
 */

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || "http://localhost:3000/auth/callback";
const LOGOUT_URI = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI || "http://localhost:3000/auth/logout";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface AuthTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface UserSession {
  id: string;
  email: string | null;
  display_name: string;
  role: string;
  permissions: string[];
}

const TOKEN_STORAGE_KEY = "pailo_auth_tokens";
const SESSION_STORAGE_KEY = "pailo_session";

/**
 * Get the Cognito Hosted UI login URL.
 */
export function getLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: "email openid profile",
    redirect_uri: REDIRECT_URI,
  });
  return `https://${COGNITO_DOMAIN}/login?${params.toString()}`;
}

/**
 * Get the Cognito logout URL.
 */
export function getLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: LOGOUT_URI,
  });
  return `https://${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<AuthTokens> {
  const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json() as Promise<AuthTokens>;
}

/**
 * Refresh the access token using the refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return response.json() as Promise<AuthTokens>;
}

/**
 * Store tokens in localStorage.
 */
export function storeTokens(tokens: AuthTokens): void {
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ ...tokens, expires_at: expiresAt }));
}

/**
 * Get stored tokens.
 */
export function getStoredTokens(): (AuthTokens & { expires_at: number }) | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear stored tokens and session.
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Check if the user is authenticated (has valid tokens).
 */
export function isAuthenticated(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return false;
  // Consider tokens expired 60 seconds before actual expiry
  return tokens.expires_at > Date.now() + 60000;
}

/**
 * Get a valid access token, refreshing if necessary.
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  // If token is still valid (with 60s buffer)
  if (tokens.expires_at > Date.now() + 60000) {
    return tokens.access_token;
  }

  // Try to refresh
  if (tokens.refresh_token) {
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      // Preserve refresh_token if not returned in refresh response
      if (!newTokens.refresh_token) {
        newTokens.refresh_token = tokens.refresh_token;
      }
      storeTokens(newTokens);
      return newTokens.access_token;
    } catch {
      clearAuth();
      return null;
    }
  }

  clearAuth();
  return null;
}

/**
 * Fetch the user session from the backend.
 */
export async function fetchSession(accessToken: string): Promise<UserSession> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Session fetch failed: ${response.status}`);
  }

  return response.json() as Promise<UserSession>;
}

/**
 * Store session data.
 */
export function storeSession(session: UserSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Get stored session.
 */
export function getStoredSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Check if auth is configured (Cognito domain is set).
 */
export function isAuthConfigured(): boolean {
  return Boolean(COGNITO_DOMAIN && CLIENT_ID);
}
