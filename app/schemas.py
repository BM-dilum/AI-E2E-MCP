from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    completed: bool


class Todo(TodoBase):
    id: int
    completed: bool = False
    created_at: datetime

    class Config:
        from_attributes = True