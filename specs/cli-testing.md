# CLI Testing

## Requirements
- [x] Tests using Node.js built-in test runner (node:test)
- [x] Test argument parsing: flags, positional args, missing args
- [x] Test output formatting: table rendering, color codes, help text
- [x] Integration tests: start server, run CLI commands, verify output and side effects
- [x] Test error handling: connection refused, invalid commands, API errors
- [x] `npm test` continues to run all tests (existing + CLI) and exits with correct code

## Acceptance Criteria
- `npm test` passes with 0 exit code including new CLI tests
- Tests cover happy paths and error cases for each command
- Integration tests verify actual API round-trips (add task via CLI, verify via API)
- Tests respect NO_COLOR for predictable output matching

## Decisions
- Use node:test and node:assert (consistent with existing test approach)
- Integration tests spawn CLI as child process and capture stdout/stderr
- Test server started/stopped per test file using the existing app export
- Test file: `src/cli.test.js`

## Constraints
- No external test frameworks
- No mocking of HTTP calls in integration tests — hit real server
