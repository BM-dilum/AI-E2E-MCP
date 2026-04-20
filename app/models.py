from datetime import datetime
from threading import RLock
from typing import Optional
from uuid import uuid4


class Todo:
    def __init__(
        self,
        title: str,
        description: Optional[str] = None,
        completed: bool = False,
        created_at: Optional[datetime] = None,
        todo_id: Optional[str] = None,
    ) -> None:
        self.id = todo_id or str(uuid4())
        self.title = title
        self.description = description
        self.completed = completed
        self.created_at = created_at or datetime.utcnow()

    def mark_completed(self) -> None:
        self.completed = True


class TodoStore:
    def __init__(self) -> None:
        self._todos: dict[str, Todo] = {}
        self._lock = RLock()

    def clear(self) -> None:
        with self._lock:
            self._todos.clear()

    def create(
        self,
        title: str,
        description: Optional[str] = None,
        completed: bool = False,
        created_at: Optional[datetime] = None,
        todo_id: Optional[str] = None,
    ) -> Todo:
        todo = Todo(
            title=title,
            description=description,
            completed=completed,
            created_at=created_at,
            todo_id=todo_id,
        )
        with self._lock:
            self._todos[todo.id] = todo
            return todo

    def list_todos(self) -> list[Todo]:
        with self._lock:
            return list(self._todos.values())

    def get(self, todo_id: str) -> Optional[Todo]:
        with self._lock:
            return self._todos.get(todo_id)

    def update(
        self,
        todo_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        completed: Optional[bool] = None,
    ) -> Optional[Todo]:
        with self._lock:
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
        with self._lock:
            return self._todos.pop(todo_id, None) is not None

    def add(self, todo: Todo) -> Todo:
        with self._lock:
            self._todos[todo.id] = todo
            return todo

    def all(self) -> list[Todo]:
        return self.list_todos()

    def retrieve(self, todo_id: str) -> Optional[Todo]:
        return self.get(todo_id)