# Testing

## Requirements
- [x] Tests using Node.js built-in test runner (node:test)
- [x] Test all CRUD endpoints (happy path + error cases)
- [x] Tests use a separate test database (not the production one)
- [x] npm test runs all tests and exits with correct code
- [x] Tests cover sorting functionality
- [x] Tests cover status validation on PATCH
- [ ] Tests for priority field (create with priority, filter by priority, validate priority)
- [ ] Tests for due_date field (create with due_date, overdue filter)
- [ ] Tests for tags (add tag, remove tag, list tags, filter by tag)
- [ ] Tests for projects (CRUD, list project tasks, assign task to project)
- [ ] Tests for health endpoint
- [ ] Test that GET /tasks/:id includes tags and project in response

## Acceptance Criteria
- `npm test` passes with 0 exit code
- 40+ tests total covering all new and existing functionality
- Tests cover happy paths AND error cases for each new feature
- Test database is cleaned up between test files

## Decisions
- Use node:test and node:assert (no external test dependencies)
- Test database at data/test.db, deleted before each test run
- Tests import the Express app directly, use a test server
- Split test files by feature area: tasks.test.js, tags.test.js, projects.test.js, health.test.js
- Shared test helper module for HTTP request helper and setup/teardown

## Constraints
- No external test frameworks (jest, mocha, etc.)
- No mocking — hit real SQLite
