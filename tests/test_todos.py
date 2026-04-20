import pytest
from fastapi.testclient import TestClient

from app.main import app, store


@pytest.fixture(autouse=True)
def clear_todos():
    store.clear()
    yield
    store.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_create_todo(client):
    response = client.post(
        "/todos",
        json={"title": "Buy milk", "description": "2% milk"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"]
    assert data["title"] == "Buy milk"
    assert data["description"] == "2% milk"
    assert data["completed"] is False
    assert "created_at" in data


def test_list_all_todos(client):
    client.post("/todos", json={"title": "Task 1"})
    client.post("/todos", json={"title": "Task 2", "description": "Second task"})

    response = client.get("/todos")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    titles = {todo["title"] for todo in data}
    assert titles == {"Task 1", "Task 2"}


def test_get_todo_by_id(client):
    create_response = client.post("/todos", json={"title": "Read book"})
    todo_id = create_response.json()["id"]

    response = client.get(f"/todos/{todo_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == todo_id
    assert data["title"] == "Read book"


def test_complete_todo(client):
    create_response = client.post("/todos", json={"title": "Finish project"})
    todo_id = create_response.json()["id"]

    response = client.patch(f"/todos/{todo_id}/complete")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == todo_id
    assert data["completed"] is True

    get_response = client.get(f"/todos/{todo_id}")
    assert get_response.status_code == 200
    assert get_response.json()["completed"] is True


def test_delete_todo(client):
    create_response = client.post("/todos", json={"title": "Delete me"})
    todo_id = create_response.json()["id"]

    response = client.delete(f"/todos/{todo_id}")

    assert response.status_code == 204
    assert response.content == b""

    get_response = client.get(f"/todos/{todo_id}")
    assert get_response.status_code == 404


def test_todo_not_found(client):
    missing_id = "non-existent-id"

    get_response = client.get(f"/todos/{missing_id}")
    assert get_response.status_code == 404
    assert get_response.json()["detail"] == "Todo not found"

    delete_response = client.delete(f"/todos/{missing_id}")
    assert delete_response.status_code == 404
    assert delete_response.json()["detail"] == "Todo not found"