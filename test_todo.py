import pytest

from todo import add_task, remove_task, complete_task, list_tasks


def test_add_task_adds_a_task_correctly():
    task_list = []
    add_task(task_list, "Buy milk")
    assert task_list == [{"task": "Buy milk", "completed": False}]


def test_remove_task_removes_a_task_correctly():
    task_list = [
        {"task": "Buy milk", "completed": False},
        {"task": "Walk dog", "completed": False},
    ]
    remove_task(task_list, "Buy milk")
    assert task_list == [{"task": "Walk dog", "completed": False}]


def test_complete_task_marks_task_as_completed():
    task_list = [
        {"task": "Buy milk", "completed": False},
        {"task": "Walk dog", "completed": False},
    ]
    complete_task(task_list, "Walk dog")
    assert task_list == [
        {"task": "Buy milk", "completed": False},
        {"task": "Walk dog", "completed": True},
    ]


def test_list_tasks_returns_all_tasks():
    task_list = [
        {"task": "Buy milk", "completed": False},
        {"task": "Walk dog", "completed": True},
    ]
    assert list_tasks(task_list) == task_list