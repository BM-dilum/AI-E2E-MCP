def add_task(task_list, task):
    """Add a task to the task list as incomplete."""
    task_list.append({"task": task, "completed": False})
    return task_list


def remove_task(task_list, task):
    """Remove the first matching task from the task list."""
    for index, item in enumerate(task_list):
        if item["task"] == task:
            del task_list[index]
            break
    return task_list


def complete_task(task_list, task):
    """Mark the first matching task in the task list as completed."""
    for item in task_list:
        if item["task"] == task:
            item["completed"] = True
            break
    return task_list


def list_tasks(task_list):
    """Return the current task list."""
    return task_list