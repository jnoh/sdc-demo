# REST API

## Requirements
- [ ] Express server on port 3000 (configurable via PORT env)
- [ ] GET /tasks — list all tasks, optional ?status= filter
- [ ] POST /tasks — create a task (title required, description optional)
- [ ] GET /tasks/:id — get a single task
- [ ] PATCH /tasks/:id — update title, description, or status
- [ ] DELETE /tasks/:id — delete a task
- [ ] JSON error responses with appropriate status codes

## Acceptance Criteria
- POST /tasks with {title: "test"} → 201 + task object with id
- GET /tasks → 200 + array of tasks
- GET /tasks?status=todo → only todo tasks
- GET /tasks/999 → 404 + {error: "Task not found"}
- PATCH /tasks/:id with {status: "done"} → 200 + updated task
- DELETE /tasks/:id → 204
- POST /tasks with {} → 400 + {error: "title is required"}

## Decisions
- Express with express.json() middleware
- Route handlers in src/routes/tasks.js
- Entry point at src/index.js
- Timestamps returned as ISO strings

## Constraints
- No authentication
- No pagination (v1)
