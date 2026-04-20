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