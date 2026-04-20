from datetime import datetime
from typing import Optional
from uuid import uuid4


class Todo:
    def __init__(
        self,
        title: str,
        description: Optional[str] = None,
        completed: bool = False,
        created_at: Optional[datetime] = None,
        id: Optional[str] = None,
    ) -> None:
        self.id = id or str(uuid4())
        self.title = title
        self.description = description
        self.completed = completed
        self.created_at = created_at or datetime.utcnow()

    def mark_completed(self) -> None:
        self.completed = True


class TodoStore:
    def __init__(self) -> None:
        self._todos: dict[str, Todo] = {}

    def clear(self) -> None:
        self._todos.clear()

    def create(
        self,
        title: str,
        description: Optional[str] = None,
        completed: bool = False,
        created_at: Optional[datetime] = None,
        id: Optional[str] = None,
    ) -> Todo:
        todo = Todo(
            title=title,
            description=description,
            completed=completed,
            created_at=created_at,
            id=id,
        )
        self._todos[todo.id] = todo
        return todo

    def list(self) -> list[Todo]:
        return list(self._todos.values())

    def get(self, todo_id: str) -> Optional[Todo]:
        return self._todos.get(todo_id)

    def update(
        self,
        todo_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        completed: Optional[bool] = None,
    ) -> Optional[Todo]:
        todo = self._todos.get(todo_id)
        if todo is None:
            return None
        if title is not None:
            todo.title = title
        if description is not None:
            todo.description = description
        if completed is not None:
            todo.completed = completed
        return todo

    def delete(self, todo_id: str) -> bool:
        return self._todos.pop(todo_id, None) is not None

    def add(self, todo: Todo) -> Todo:
        self._todos[todo.id] = todo
        return todo

    def all(self) -> list[Todo]:
        return self.list()

    def retrieve(self, todo_id: str) -> Optional[Todo]:
        return self.get(todo_id)