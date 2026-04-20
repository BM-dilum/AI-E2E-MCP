from fastapi import FastAPI, HTTPException, status

from app.models import TodoStore
from app.schemas import TodoCreate, TodoRead

app = FastAPI(title="Todo REST API")

store = TodoStore()


@app.post("/todos", response_model=TodoRead, status_code=status.HTTP_201_CREATED)
def create_todo(todo: TodoCreate) -> TodoRead:
    created = store.create(todo.title, todo.description)
    return TodoRead.model_validate(created)


@app.get("/todos", response_model=list[TodoRead])
def list_todos() -> list[TodoRead]:
    return [TodoRead.model_validate(todo) for todo in store.list()]


@app.get("/todos/{todo_id}", response_model=TodoRead)
def get_todo(todo_id: str) -> TodoRead:
    todo = store.get(todo_id)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return TodoRead.model_validate(todo)


@app.patch("/todos/{todo_id}/complete", response_model=TodoRead)
def complete_todo(todo_id: str) -> TodoRead:
    todo = store.get(todo_id)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    store.complete(todo_id)
    return TodoRead.model_validate(todo)


@app.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: str) -> None:
    deleted = store.delete(todo_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return None