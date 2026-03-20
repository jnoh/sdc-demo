# REST API

## Requirements
- [x] Express server on port 3000 (configurable via PORT env)
- [x] GET /tasks — list all tasks, optional ?status= filter
- [x] POST /tasks — create a task (title required, description optional)
- [x] GET /tasks/:id — get a single task
- [x] PATCH /tasks/:id — update title, description, or status
- [x] DELETE /tasks/:id — delete a task
- [x] JSON error responses with appropriate status codes
- [x] GET /tasks supports ?sort=created_at:asc or ?sort=created_at:desc
- [x] PATCH /tasks/:id validates status is one of: todo, in-progress, done
- [ ] POST /tasks accepts optional priority (low/medium/high) and due_date fields
- [ ] PATCH /tasks/:id can update priority and due_date
- [ ] GET /tasks supports ?priority= filter
- [ ] GET /tasks supports ?overdue=true filter (due_date < now AND status != done)
- [ ] GET /tasks/:id response includes tags array and project object (if assigned)
- [ ] POST /tasks/:id/tags — add a tag to a task (create tag if it doesn't exist)
- [ ] DELETE /tasks/:id/tags/:tagName — remove a tag from a task
- [ ] GET /tags — list all tags with task counts
- [ ] GET /tasks supports ?tag= filter
- [ ] CRUD endpoints for projects: GET /projects, POST /projects, GET /projects/:id, PATCH /projects/:id, DELETE /projects/:id
- [ ] GET /projects/:id/tasks — list tasks belonging to a project
- [ ] PATCH /tasks/:id can assign/unassign project_id
- [ ] GET /health — returns { status: "ok", uptime, taskCount }

## Acceptance Criteria
- POST /tasks with {title: "test", priority: "high", due_date: "2026-04-01T00:00:00Z"} → 201
- GET /tasks?priority=high → only high-priority tasks
- GET /tasks?overdue=true → only tasks past due date that aren't done
- POST /tasks/1/tags with {name: "urgent"} → 201, tag attached
- GET /tasks/1 → includes tags: [{id, name}] and project: {id, name} or null
- GET /tags → [{id, name, taskCount}]
- GET /tasks?tag=urgent → tasks with that tag
- POST /projects with {name: "Q1 Sprint"} → 201
- GET /projects/1/tasks → tasks in that project
- PATCH /tasks/1 with {project_id: 1} → assigns task to project
- GET /health → 200 + {status: "ok", uptime: <number>, taskCount: <number>}
- PATCH /tasks/:id with {priority: "invalid"} → 400

## Decisions
- Route handlers split into separate files: src/routes/tasks.js, src/routes/tags.js, src/routes/projects.js, src/routes/health.js
- Tags are normalized (lowercase, trimmed)
- Overdue filter uses server time, not client time
- Health endpoint has no auth

## Constraints
- No authentication
- No pagination (v1)
