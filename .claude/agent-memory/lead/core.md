# Lead Agent Memory

## Architecture
- Database: `src/db.js` — better-sqlite3 singleton, WAL mode, foreign_keys ON, DB_PATH env var for path override
- API: `src/index.js` — Express app, exports `app`, only listens when `require.main === module`
- Routes: `src/routes/tasks.js` — full CRUD on `/tasks`, priority, due_date, sorting, status/priority validation, tag management (POST/DELETE), enriched GET /:id (tags + project)
- Routes: `src/routes/tags.js` — GET /tags with task counts
- Routes: `src/routes/projects.js` — full CRUD on `/projects` + GET /:id/tasks
- Routes: `src/routes/health.js` — GET /health with status, uptime, taskCount
- CLI: `bin/tasks` — entry point with command dispatch, `bin/lib/` (args, http, output), `bin/commands/` (list, add, show, update, done, delete, tag, untag, tags, projects)
- CLI patterns: commands export `run(positionals, flags)` + optional `help()`, lazy-loaded from registry in entry point
- Tests: `src/tasks.test.js` (47 tests), `src/projects.test.js` (19 tests), `src/health.test.js` (6 tests), `src/cli.test.js` (32 tests) — 104 total

## Database Schema
- Tables: projects, tasks, tags, task_tags
- tasks: id, title, description, status, priority (DEFAULT 'medium'), due_date, project_id (FK → projects ON DELETE SET NULL), created_at, updated_at
- tags: id, name (UNIQUE)
- task_tags: task_id + tag_id composite PK, CASCADE deletes
- projects: id, name, description, created_at
- ALTER TABLE fallbacks for upgrading v1 databases

## Patterns
- Timestamps are caller-managed (ISO strings via `new Date().toISOString()`)
- Tags normalized: `name.trim().toLowerCase()`
- Dynamic WHERE building: conditions array + params array, joined with AND
- Tag filter uses JOINs on task_tags/tags
- GET /tasks/:id enriches response with `tags` array and `project` object
- Worktree isolation: each agent gets its own worktree, branches diverge from main independently — must merge sequentially
- gh cli on this repo: `--json` flag not supported on `issue create`, use URL output instead
- Labels must be created before use: `gh label create "name"`
- Milestone must be referenced by name (not number) in `gh issue edit --milestone`

## Lessons
- Worktree agents each fork from the main branch state at spawn time — they don't see each other's changes
- Cherry-picks in worktrees don't propagate to main — must merge branches into main from the main working directory
- Always `cd` back to the main repo before merging
- When multiple agents modify the same file (e.g. tasks.js, index.js), merge sequentially and resolve conflicts manually — combining features from both sides
- `.claude/worktrees/` and `.sdc/` must be in .gitignore to avoid committing runtime state
- `git add -A` is dangerous — can accidentally stage worktree directories as embedded git repos
- Team agents (non-worktree) share the repo — parallel agents creating separate files works well, but agents touching same files still need sequential merge
- When one agent completes work that overlaps another agent's scope, shut down the redundant agent early to save context
- Foundation-first task ordering (core framework → commands → tests) with parallel middle layer works well for CLI tools
