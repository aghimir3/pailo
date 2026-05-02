from collections.abc import Iterator
from typing import cast

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_dashboard_contains_owner_insights(client: TestClient) -> None:
    response = client.get("/api/v1/reports/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert payload["target_cost_npr"] == 900
    assert len(payload["owner_insights"]) >= 3
    assert any(insight["tone"] == "red" for insight in payload["owner_insights"])


def test_my_tasks_are_worker_scoped_to_current_user(client: TestClient) -> None:
    response = client.get("/api/v1/tasks/my-tasks")
    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert {task["assignee"]["display_name"] for task in payload} == {"Ram"}
    assert any(task["task_code"] == "TASK-2026-000041" for task in payload)


def test_blocked_task_requires_reason(client: TestClient) -> None:
    task = _first_task(client, "TASK-2026-000044")
    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"new_status": "blocked", "version": task["version"]},
    )
    assert response.status_code == 422
    assert "blocker reason" in response.json()["detail"]


def test_review_required_task_cannot_complete_before_review(client: TestClient) -> None:
    task = _first_task(client, "TASK-2026-000046")
    response = client.post(
        f"/api/v1/tasks/{task['id']}/updates",
        json={"new_status": "done", "completed_quantity": "7", "version": task["version"]},
    )
    assert response.status_code == 409
    assert "review" in response.json()["detail"].lower()


def test_comment_create_and_author_only_edit(client: TestClient) -> None:
    task = _first_task(client, "TASK-2026-000041")
    create_response = client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={"comment_text": "Need another roll staged before stitching.", "client_message_id": "test-comment-001"},
    )
    assert create_response.status_code == 201
    comment = create_response.json()

    forbidden_response = client.patch(
        f"/api/v1/tasks/{task['id']}/comments/{comment['id']}",
        headers={"X-Pailo-User-Email": "milan@pailoshoes.com"},
        json={"comment_text": "Manager rewrite", "version": comment["version"]},
    )
    assert forbidden_response.status_code == 403

    edit_response = client.patch(
        f"/api/v1/tasks/{task['id']}/comments/{comment['id']}",
        json={"comment_text": "Need two rolls staged before stitching.", "version": comment["version"]},
    )
    assert edit_response.status_code == 200
    assert edit_response.json()["edited_at"] is not None


def test_label_preview_uses_24_up_sheet(client: TestClient) -> None:
    templates_response = client.get("/api/v1/labels/templates")
    assert templates_response.status_code == 200
    sticker_template = templates_response.json()[0]
    response = client.post(
        f"/api/v1/labels/templates/{sticker_template['id']}/preview",
        json={
            "quantity": 25,
            "art_no": "PAI-2026-SCH-001",
            "colour": "White",
            "size": "39",
            "mrp_npr": "1899",
            "manufactured_by": "Pailo Shoes",
            "origin_text": "Made in Nepal",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["template"]["slots_per_page"] == 24
    assert payload["page_count"] == 2
    assert payload["slots"][0]["row"] == 1
    assert payload["slots"][0]["column"] == 1


def _first_task(client: TestClient, task_code: str) -> dict[str, object]:
    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    for task in response.json():
        if task["task_code"] == task_code:
            return cast(dict[str, object], task)
    raise AssertionError(f"Task {task_code} was not found")
