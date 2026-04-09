import unittest

from todo import add_task, remove_task, complete_task, list_tasks


class TestTodo(unittest.TestCase):
    def test_add_task_adds_a_task_correctly(self):
        """Verify that adding a task appends the correct task structure."""
        task_list = []
        add_task(task_list, "Buy milk")
        self.assertEqual(task_list, [{"task": "Buy milk", "completed": False}])

    def test_remove_task_removes_a_task_correctly(self):
        """Verify that removing a task deletes the matching task."""
        task_list = [
            {"task": "Buy milk", "completed": False},
            {"task": "Walk dog", "completed": False},
        ]
        remove_task(task_list, "Buy milk")
        self.assertEqual(task_list, [{"task": "Walk dog", "completed": False}])

    def test_complete_task_marks_task_as_completed(self):
        """Verify that completing a task marks it as completed."""
        task_list = [{"task": "Buy milk", "completed": False}]
        complete_task(task_list, "Buy milk")
        self.assertEqual(task_list, [{"task": "Buy milk", "completed": True}])

    def test_list_tasks_returns_all_tasks(self):
        """Verify that listing tasks returns the full task list."""
        task_list = [
            {"task": "Buy milk", "completed": False},
            {"task": "Walk dog", "completed": True},
        ]
        self.assertEqual(list_tasks(task_list), task_list)


if __name__ == "__main__":
    unittest.main()