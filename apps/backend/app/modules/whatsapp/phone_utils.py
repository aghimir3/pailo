"""Phone number normalization utilities for Nepal numbers."""

import re

from app.core.config import get_settings


def normalize_phone_to_e164(phone: str | None) -> str | None:
    """
    Normalize a phone number to E.164 format for WhatsApp.
    Handles Nepal numbers: 98XXXXXXXX, 098XXXXXXXX, +97798XXXXXXXX.
    Returns None if phone is missing or unparseable.
    """
    if not phone:
        return None

    # Strip spaces, dashes, dots, parens
    cleaned = re.sub(r"[\s\-\.\(\)]+", "", phone.strip())
    if not cleaned:
        return None

    # Already E.164
    if cleaned.startswith("+") and len(cleaned) >= 10:
        return cleaned

    settings = get_settings()
    default_code = settings.whatsapp_default_country_code  # "+977"

    # Remove leading 0 (Nepal trunk prefix)
    if cleaned.startswith("0"):
        cleaned = cleaned[1:]

    # Nepal mobile: 10 digits starting with 9
    if len(cleaned) == 10 and cleaned.startswith("9"):
        return f"{default_code}{cleaned}"

    # If already has country code without +
    if cleaned.startswith("977") and len(cleaned) >= 12:
        return f"+{cleaned}"

    # Fallback: prepend country code if reasonable length
    if len(cleaned) >= 7:
        return f"{default_code}{cleaned}"

    return None  # Too short / unparseable
