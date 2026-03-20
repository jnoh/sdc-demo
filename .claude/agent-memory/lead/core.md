# Lead Agent Memory

## Architecture
- Database: `src/db.js` — better-sqlite3 singleton, WAL mode, DB_PATH env var for path override
- API: `src/index.js` — Express app, exports `app`, only listens when `require.main === module`
- Routes: `src/routes/tasks.js` — full CRUD on `/tasks`, sorting via `?sort=created_at:asc|desc`, status validation on PATCH
- Tests: `src/tasks.test.js` — 19 tests using node:test, ephemeral port, test db via DB_PATH (covers CRUD, sorting, status validation)

## Patterns
- Timestamps are caller-managed (ISO strings via `new Date().toISOString()`)
- Worktree isolation: each agent gets its own worktree, branches diverge from main independently — must merge sequentially (database first, then API, then tests)
- gh cli on this repo: `--json` flag not supported on `issue create`, use URL output instead
- Labels must be created before use: `gh label create "name"`
- Milestone must be referenced by name (not number) in `gh issue edit --milestone`

## Lessons
- Worktree agents each fork from the main branch state at spawn time — they don't see each other's changes
- Cherry-picks in worktrees don't propagate to main — must merge branches into main from the main working directory
- Always `cd` back to the main repo before merging
