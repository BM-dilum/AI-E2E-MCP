from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List, Optional
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
        self.created_at = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "completed": self.completed,
            "created_at": self.created_at,
        }


class TodoStore:
    def __init__(self) -> None:
        self._todos: Dict[str, Todo] = {}
        self._lock = Lock()

    def create(self, title: str, description: Optional[str] = None) -> Todo:
        todo = Todo(title=title, description=description)
        with self._lock:
            self._todos[todo.id] = todo
        return todo

    def list_all(self) -> List[Todo]:
        with self._lock:
            return list(self._todos.values())

    def get(self, todo_id: str) -> Optional[Todo]:
        with self._lock:
            return self._todos.get(todo_id)

    def complete(self, todo_id: str) -> Optional[Todo]:
        with self._lock:
            todo = self._todos.get(todo_id)
            if todo is None:
                return None
            todo.completed = True
            return todo

    def delete(self, todo_id: str) -> bool:
        with self._lock:
            if todo_id not in self._todos:
                return False
            del self._todos[todo_id]
            return True


todo_store = TodoStore()