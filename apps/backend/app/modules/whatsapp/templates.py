"""WhatsApp message template definitions and variable builders."""


def task_assigned_components(task_code: str, task_title: str, assigner_name: str) -> list[dict]:
    """Template: task_assigned
    Body: "You have been assigned task {{1}}: {{2}} by {{3}}. Open the app to view details."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:100]},
        {"type": "text", "text": assigner_name},
    ]}]


def task_status_update_components(
    task_code: str, task_title: str, new_status: str, actor_name: str
) -> list[dict]:
    """Template: task_status_update
    Body: "Task {{1}} ({{2}}) status changed to {{3}} by {{4}}."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:80]},
        {"type": "text", "text": new_status.replace("_", " ").title()},
        {"type": "text", "text": actor_name},
    ]}]


def task_blocked_components(
    task_code: str, task_title: str, blocker_reason: str, actor_name: str
) -> list[dict]:
    """Template: task_blocked
    Body: "Task {{1}} ({{2}}) is BLOCKED. Reason: {{3}}. Reported by {{4}}."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:80]},
        {"type": "text", "text": blocker_reason[:200] if blocker_reason else "No reason given"},
        {"type": "text", "text": actor_name},
    ]}]


def task_unblocked_components(
    task_code: str, task_title: str, new_status: str, actor_name: str
) -> list[dict]:
    """Template: task_unblocked
    Body: "Task {{1}} ({{2}}) is now unblocked. New status: {{3}}. Updated by {{4}}."
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": task_code},
        {"type": "text", "text": task_title[:80]},
        {"type": "text", "text": new_status.replace("_", " ").title()},
        {"type": "text", "text": actor_name},
    ]}]


def task_comment_components(
    task_code: str, commenter_name: str, comment_preview: str
) -> list[dict]:
    """Template: task_comment
    Body: "{{1}} commented on task {{2}}: {{3}}"
    """
    return [{"type": "body", "parameters": [
        {"type": "text", "text": commenter_name},
        {"type": "text", "text": task_code},
        {"type": "text", "text": comment_preview[:150]},
    ]}]
