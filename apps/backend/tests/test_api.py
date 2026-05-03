from collections.abc import Iterator
from typing import cast
from uuid import uuid4

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


def test_api_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "scope": "api"}


def test_dashboard_contains_owner_insights(client: TestClient) -> None:
    response = client.get("/api/v1/reports/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert payload["target_cost_npr"] == 900
    assert len(payload["owner_insights"]) >= 3
    assert any(insight["tone"] == "red" for insight in payload["owner_insights"])


def test_operations_catalog_uses_production_route(client: TestClient) -> None:
    response = client.get("/api/v1/operations/catalog")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["work_orders"]) >= 2


def test_inventory_quality_and_work_order_routes(client: TestClient) -> None:
    low_stock_response = client.get("/api/v1/inventory/low-stock")
    assert low_stock_response.status_code == 200
    assert {alert["code"] for alert in low_stock_response.json()} >= {"MAT-THR-BLK", "MAT-OUT-TR42"}

    materials_response = client.get("/api/v1/inventory/materials")
    assert materials_response.status_code == 200
    assert any(material["risk"].startswith("Near minimum") for material in materials_response.json())

    signals_response = client.get("/api/v1/quality/signals")
    assert signals_response.status_code == 200
    assert signals_response.json()[0]["label"] == "Defect rate"

    inspections_response = client.get("/api/v1/quality/inspections")
    assert inspections_response.status_code == 200
    assert inspections_response.json()[0]["inspection_code"] == "QC-2026-000001"

    work_orders_response = client.get("/api/v1/work-orders")
    assert work_orders_response.status_code == 200
    work_order = work_orders_response.json()[0]
    detail_response = client.get(f"/api/v1/work-orders/{work_order['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["work_order_code"] == work_order["work_order_code"]


def test_csv_exports_include_expected_headers(client: TestClient) -> None:
    tasks_response = client.get("/api/v1/reports/tasks.csv")
    assert tasks_response.status_code == 200
    assert tasks_response.headers["content-disposition"] == 'attachment; filename="pailo-tasks.csv"'
    assert tasks_response.text.splitlines()[0] == "task_code,title,status,priority,assignee,work_order,due_at"

    stock_response = client.get("/api/v1/reports/low-stock.csv")
    assert stock_response.status_code == 200
    assert stock_response.text.splitlines()[0] == "material,code,current,minimum,risk,supplier"


def test_my_tasks_are_worker_scoped_to_current_user(client: TestClient) -> None:
    response = client.get("/api/v1/tasks/my-tasks")
    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert {task["assignee"]["display_name"] for task in payload} == {"Ram"}
    assert any(task["task_code"] == "TASK-2026-000041" for task in payload)


def test_task_detail_and_auth_errors(client: TestClient) -> None:
    task = _first_task(client, "TASK-2026-000041")
    detail_response = client.get(f"/api/v1/tasks/{task['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["task_code"] == "TASK-2026-000041"

    missing_task_response = client.get(f"/api/v1/tasks/{uuid4()}")
    assert missing_task_response.status_code == 404
    assert "not found" in missing_task_response.json()["detail"]

    invalid_user_response = client.get(
        "/api/v1/tasks/my-tasks",
        headers={"X-Pailo-User-Email": "missing@pailoshoes.com"},
    )
    assert invalid_user_response.status_code == 401


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
            "colour": "White",
            "size": "39",
            "mrp_npr": "1899",
            "manufactured_by": "AB Fashion & Wears",
            "origin_text": "Made in Nepal",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["template"]["slots_per_page"] == 24
    assert payload["template"]["label_height_mm"] == "33.87"
    assert payload["template"]["margin_left_mm"] == "7.20"
    assert payload["template"]["margin_top_mm"] == "13.09"
    assert payload["template"]["gap_x_mm"] == "2.54"
    assert payload["template"]["gap_y_mm"] == "0.00"
    assert payload["page_count"] == 2
    assert payload["slots"][0]["row"] == 1
    assert payload["slots"][0]["column"] == 1
    assert payload["slots"][0]["x_mm"] == "7.20"
    assert payload["slots"][0]["y_mm"] == "13.09"
    assert payload["slots"][1]["x_mm"] == "73.24"
    assert payload["slots"][2]["x_mm"] == "139.28"
    assert payload["slots"][3]["y_mm"] == "46.96"
    assert payload["values"]["art_no"] == "AFL 02"


def test_saved_label_api_lifecycle_records_print_snapshots(client: TestClient) -> None:
    templates_response = client.get("/api/v1/labels/templates")
    assert templates_response.status_code == 200
    template_id = templates_response.json()[0]["id"]
    manager_headers = {"X-Pailo-User-Email": "milan@pailoshoes.com"}

    create_response = client.post(
        "/api/v1/labels/saved",
        headers=manager_headers,
        json={
            "template_id": template_id,
            "art_no": "AFL 02",
            "colour": "White",
            "size": "39",
            "mrp_npr": "1899",
            "manufactured_by": "AB Fashion & Wears",
            "origin_text": "Made in Nepal",
            "default_quantity": 24,
        },
    )
    assert create_response.status_code == 201
    saved_label = create_response.json()
    assert saved_label["label_code"].startswith("SLBL-2026-")
    assert saved_label["name"] == "AFL 02 - White - 39"

    list_response = client.get("/api/v1/labels/saved")
    assert list_response.status_code == 200
    assert any(label["id"] == saved_label["id"] for label in list_response.json())

    preview_response = client.post(
        f"/api/v1/labels/saved/{saved_label['id']}/preview",
        json={"quantity": 25},
    )
    assert preview_response.status_code == 200
    assert preview_response.json()["page_count"] == 2

    patch_response = client.patch(
        f"/api/v1/labels/saved/{saved_label['id']}",
        headers=manager_headers,
        json={"size": "40", "version": saved_label["version"]},
    )
    assert patch_response.status_code == 200
    patched_label = patch_response.json()
    assert patched_label["size"] == "40"
    assert patched_label["version"] == saved_label["version"] + 1

    print_response = client.post(
        f"/api/v1/labels/saved/{saved_label['id']}/print-jobs",
        json={"quantity": 24},
    )
    assert print_response.status_code == 201
    print_job = print_response.json()
    assert print_job["saved_label_id"] == saved_label["id"]
    assert print_job["template_version"] == patched_label["template_version"]
    assert print_job["field_values"]["size"] == "40"

    archive_response = client.delete(
        f"/api/v1/labels/saved/{saved_label['id']}?version={patched_label['version']}",
        headers=manager_headers,
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"


def _first_task(client: TestClient, task_code: str) -> dict[str, object]:
    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    for task in response.json():
        if task["task_code"] == task_code:
            return cast(dict[str, object], task)
    raise AssertionError(f"Task {task_code} was not found")
