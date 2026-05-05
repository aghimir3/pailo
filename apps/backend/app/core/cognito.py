"""Cognito admin operations for user management."""

import boto3
import structlog
from botocore.exceptions import ClientError

from app.core.config import get_settings

logger = structlog.get_logger()


class CognitoError(Exception):
    """Raised when a Cognito operation fails."""

    def __init__(self, message: str, code: str = "CognitoError"):
        self.message = message
        self.code = code
        super().__init__(message)


def _get_client():  # type: ignore[no-untyped-def]
    settings = get_settings()
    return boto3.client("cognito-idp", region_name=settings.aws_region)


def admin_create_user(email: str, display_name: str) -> str:
    """Create a user in Cognito and send an invitation email.

    Returns the Cognito 'sub' (unique user ID).
    Raises CognitoError on failure.
    """
    settings = get_settings()
    client = _get_client()

    try:
        response = client.admin_create_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": display_name},
            ],
            DesiredDeliveryMediums=["EMAIL"],
        )
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.error("cognito_admin_create_user_failed", email=email, code=error_code, msg=error_msg)
        raise CognitoError(message=error_msg, code=error_code) from e

    # Extract the sub from the created user's attributes
    attributes = response.get("User", {}).get("Attributes", [])
    sub = next((a["Value"] for a in attributes if a["Name"] == "sub"), None)

    logger.info("cognito_user_created", email=email, sub=sub)
    return sub or ""


def admin_disable_user(email: str) -> None:
    """Disable a user in Cognito (prevents login)."""
    settings = get_settings()
    client = _get_client()

    try:
        client.admin_disable_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=email,
        )
        logger.info("cognito_user_disabled", email=email)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.error("cognito_admin_disable_user_failed", email=email, code=error_code, msg=error_msg)
        raise CognitoError(message=error_msg, code=error_code) from e


def admin_enable_user(email: str) -> None:
    """Re-enable a previously disabled user in Cognito."""
    settings = get_settings()
    client = _get_client()

    try:
        client.admin_enable_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=email,
        )
        logger.info("cognito_user_enabled", email=email)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.error("cognito_admin_enable_user_failed", email=email, code=error_code, msg=error_msg)
        raise CognitoError(message=error_msg, code=error_code) from e


def admin_resend_invite(email: str) -> None:
    """Resend the invitation email with a new temporary password."""
    settings = get_settings()
    client = _get_client()

    try:
        client.admin_create_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=email,
            MessageAction="RESEND",
            DesiredDeliveryMediums=["EMAIL"],
        )
        logger.info("cognito_invite_resent", email=email)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.error("cognito_resend_invite_failed", email=email, code=error_code, msg=error_msg)
        raise CognitoError(message=error_msg, code=error_code) from e


def admin_delete_user(email: str) -> None:
    """Delete a user from Cognito permanently."""
    settings = get_settings()
    client = _get_client()

    try:
        client.admin_delete_user(
            UserPoolId=settings.cognito_user_pool_id,
            Username=email,
        )
        logger.info("cognito_user_deleted", email=email)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.error("cognito_admin_delete_user_failed", email=email, code=error_code, msg=error_msg)
        raise CognitoError(message=error_msg, code=error_code) from e
