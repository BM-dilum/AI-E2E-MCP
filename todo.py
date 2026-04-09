def add_task(task_list, task):
    task_list.append({"task": task, "completed": False})
    return task_list


def remove_task(task_list, task):
    for index, item in enumerate(task_list):
        if "task" in item and item["task"] == task:
            del task_list[index]
            break
    return task_list


def complete_task(task_list, task):
    for item in task_list:
        if "task" in item and item["task"] == task:
            item["completed"] = True
            break
    return task_list


def list_tasks(task_list):
    return task_list