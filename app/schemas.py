from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None


class TodoUpdate(BaseModel):
    completed: bool


class TodoRead(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Todo(TodoRead):
    pass