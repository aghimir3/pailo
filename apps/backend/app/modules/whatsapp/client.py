"""WhatsApp Cloud API HTTP client."""

from typing import Any

import httpx
import structlog

from app.core.config import get_settings

logger = structlog.get_logger()

GRAPH_API_BASE = "https://graph.facebook.com"


async def send_template_message(
    to_phone: str,
    template_name: str,
    language_code: str,
    components: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Send a WhatsApp template message. Returns API response or None on failure."""
    settings = get_settings()
    if not settings.whatsapp_enabled:
        logger.info("whatsapp_disabled", template=template_name, to=to_phone)
        return None

    url = (
        f"{GRAPH_API_BASE}/{settings.whatsapp_api_version}"
        f"/{settings.whatsapp_phone_number_id}/messages"
    )
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone.lstrip("+"),
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components,
        },
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()
            msg_id = result.get("messages", [{}])[0].get("id", "unknown")
            logger.info(
                "whatsapp_sent", template=template_name, to=to_phone, message_id=msg_id
            )
            return result
        except httpx.HTTPStatusError as e:
            logger.error(
                "whatsapp_api_error",
                status=e.response.status_code,
                body=e.response.text[:500],
                template=template_name,
                to=to_phone,
            )
            return None
        except httpx.RequestError as e:
            logger.error(
                "whatsapp_network_error",
                error=str(e),
                template=template_name,
                to=to_phone,
            )
            return None
