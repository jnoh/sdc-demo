# Testing

## Requirements
- [ ] Tests using Node.js built-in test runner (node:test)
- [ ] Test all CRUD endpoints (happy path + error cases)
- [ ] Tests use a separate test database (not the production one)
- [ ] npm test runs all tests and exits with correct code

## Acceptance Criteria
- `npm test` passes with 0 exit code
- At least one test per endpoint (6+ tests minimum)
- Tests cover: create, list, list with filter, get by id, update, delete, 404, validation error
- Test database is cleaned up between test files

## Decisions
- Use node:test and node:assert (no external test dependencies)
- Test database at data/test.db, deleted before each test run
- Tests import the Express app directly, use a test server

## Constraints
- No external test frameworks (jest, mocha, etc.)
- No mocking — hit real SQLite
