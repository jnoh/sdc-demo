# Testing

## Requirements
- [x] Tests using Node.js built-in test runner (node:test)
- [x] Test all CRUD endpoints (happy path + error cases)
- [x] Tests use a separate test database (not the production one)
- [x] npm test runs all tests and exits with correct code
- [ ] Tests cover sorting functionality
- [ ] Tests cover status validation on PATCH

## Acceptance Criteria
- `npm test` passes with 0 exit code
- Tests cover: create, list, list with filter, get by id, update, delete, 404, validation error
- Tests cover sorting by created_at asc/desc
- Tests cover invalid status rejection on PATCH
- Test database is cleaned up between test files

## Decisions
- Use node:test and node:assert (no external test dependencies)
- Test database at data/test.db, deleted before each test run
- Tests import the Express app directly, use a test server

## Constraints
- No external test frameworks (jest, mocha, etc.)
- No mocking — hit real SQLite
