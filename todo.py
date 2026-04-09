def add_task(task_list, task):
    """Add a new incomplete task to the task list.

    Args:
        task_list: The list of task dictionaries to modify.
        task: The task description to add.

    Returns:
        The updated task list.
    """
    task_list.append({"task": task, "completed": False})
    return task_list


def remove_task(task_list, task):
    """Remove the first matching task from the task list.

    Args:
        task_list: The list of task dictionaries to modify.
        task: The task description to remove.

    Returns:
        The updated task list.
    """
    for index, item in enumerate(task_list):
        if item["task"] == task:
            del task_list[index]
            break
    return task_list


def complete_task(task_list, task):
    """Mark the first matching task as completed.

    Args:
        task_list: The list of task dictionaries to modify.
        task: The task description to mark as completed.

    Returns:
        The updated task list.
    """
    for item in task_list:
        if item["task"] == task:
            item["completed"] = True
            break
    return task_list


def list_tasks(task_list):
    """Return the current list of tasks.

    Args:
        task_list: The list of task dictionaries.

    Returns:
        The task list.
    """
    return task_list