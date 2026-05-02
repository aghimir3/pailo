from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_dashboard_contains_owner_insights() -> None:
    response = client.get("/api/v1/reports/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert payload["target_cost_npr"] == 900
    assert len(payload["owner_insights"]) >= 3
    assert any(insight["tone"] == "red" for insight in payload["owner_insights"])


def test_my_tasks_are_worker_scoped_sample() -> None:
    response = client.get("/api/v1/tasks/my-tasks")
    assert response.status_code == 200
    assert {task["assignee"] for task in response.json()} == {"Ram"}
