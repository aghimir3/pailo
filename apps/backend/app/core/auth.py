"""Cognito JWT verification for Pailo backend."""

import time
from dataclasses import dataclass

import jwt
from jwt import PyJWKClient

from app.core.config import get_settings


@dataclass(frozen=True)
class TokenClaims:
    sub: str
    email: str | None
    token_use: str


_jwks_client: PyJWKClient | None = None
_jwks_client_created_at: float = 0
_JWKS_REFRESH_INTERVAL = 3600  # Re-create client every hour to refresh keys


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_client_created_at
    now = time.time()
    if _jwks_client is None or (now - _jwks_client_created_at) > _JWKS_REFRESH_INTERVAL:
        settings = get_settings()
        _jwks_client = PyJWKClient(settings.cognito_jwks_url, cache_keys=True)
        _jwks_client_created_at = now
    return _jwks_client


def verify_cognito_token(token: str) -> TokenClaims:
    """Verify a Cognito JWT access or ID token and return claims.

    Raises jwt.exceptions.PyJWTError on invalid tokens.
    """
    settings = get_settings()
    jwks_client = _get_jwks_client()

    signing_key = jwks_client.get_signing_key_from_jwt(token)

    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=settings.cognito_issuer,
        options={
            "verify_aud": False,  # Access tokens don't have aud, ID tokens do
            "verify_exp": True,
            "verify_iss": True,
        },
    )

    # Verify token_use is either "access" or "id"
    token_use = payload.get("token_use", "")
    if token_use not in ("access", "id"):
        raise jwt.InvalidTokenError("Invalid token_use claim")

    # For access tokens, client_id must match; for ID tokens, aud must match
    if token_use == "access":
        if payload.get("client_id") != settings.cognito_client_id:
            raise jwt.InvalidTokenError("Token client_id does not match")
    else:
        if payload.get("aud") != settings.cognito_client_id:
            raise jwt.InvalidTokenError("Token audience does not match")

    return TokenClaims(
        sub=payload["sub"],
        email=payload.get("email"),
        token_use=token_use,
    )
