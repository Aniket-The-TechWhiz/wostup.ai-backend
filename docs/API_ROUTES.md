# API Routes

## Tasks

Base path: /api/tasks

### Create task

POST /v1/createTask

Request body:

```json
{
  "workspaceId": "<workspaceId>",
  "title": "Design landing page",
  "description": "Create initial landing page layout",
  "status": "todo",
  "actualProgress": 0,
  "assigneeUserId": "<userId>",
  "projectId": "<projectId>",
  "milestoneId": "<milestoneId>",
  "dueDate": "2026-06-01T00:00:00.000Z",
  "dependency": ["<taskId>", "<taskId>"]
}
```

Notes:
- `dependency` is optional and must be an array of task ids. Use an empty array to clear dependencies.

### Update task

PUT /v1/updateTask/:taskId

Request body (partial allowed):

```json
{
  "status": "in-progress",
  "actualProgress": 30,
  "dependency": ["<taskId>"]
}
```

Notes:
- `dependency` is optional and must be an array of task ids. Use an empty array to clear dependencies.
