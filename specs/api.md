# REST API

## Requirements
- [x] Express server on port 3000 (configurable via PORT env)
- [x] GET /tasks — list all tasks, optional ?status= filter
- [x] POST /tasks — create a task (title required, description optional)
- [x] GET /tasks/:id — get a single task
- [x] PATCH /tasks/:id — update title, description, or status
- [x] DELETE /tasks/:id — delete a task
- [x] JSON error responses with appropriate status codes
- [ ] GET /tasks supports ?sort=created_at:asc or ?sort=created_at:desc
- [ ] PATCH /tasks/:id validates status is one of: todo, in-progress, done

## Acceptance Criteria
- POST /tasks with {title: "test"} → 201 + task object with id
- GET /tasks → 200 + array of tasks
- GET /tasks?status=todo → only todo tasks
- GET /tasks/999 → 404 + {error: "Task not found"}
- PATCH /tasks/:id with {status: "done"} → 200 + updated task
- DELETE /tasks/:id → 204
- POST /tasks with {} → 400 + {error: "title is required"}
- GET /tasks?sort=created_at:desc → tasks sorted newest first
- PATCH /tasks/:id with {status: "invalid"} → 400 + {error: "invalid status"}

## Decisions
- Express with express.json() middleware
- Route handlers in src/routes/tasks.js
- Entry point at src/index.js
- Timestamps returned as ISO strings

## Constraints
- No authentication
- No pagination (v1)
