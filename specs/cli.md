# CLI

## Requirements
- [x] `bin/tasks` entry point — executable Node.js script, no external dependencies
- [x] Connects to API at `http://localhost:3000` by default (configurable via `TASKS_API` env var)
- [x] `tasks list` — list all tasks in a formatted table (id, title, status, priority, due date)
- [x] `tasks list --status=<status>` — filter by status
- [x] `tasks list --priority=<priority>` — filter by priority
- [x] `tasks list --tag=<tag>` — filter by tag
- [x] `tasks list --overdue` — show only overdue tasks
- [x] `tasks list --sort=<field>:<dir>` — sort results (e.g. created_at:desc)
- [x] `tasks add <title>` — create a task (title from args)
- [x] `tasks add <title> --priority=<p> --due=<date> --project=<id>` — create with optional fields
- [x] `tasks show <id>` — show task detail including tags and project
- [x] `tasks update <id> --title=<t> --status=<s> --priority=<p> --due=<d> --project=<id>` — update fields
- [x] `tasks done <id>` — shortcut to mark task as done
- [x] `tasks delete <id>` — delete a task (with confirmation prompt)
- [x] `tasks tag <id> <tagName>` — add a tag to a task
- [x] `tasks untag <id> <tagName>` — remove a tag from a task
- [x] `tasks tags` — list all tags with task counts
- [x] `tasks projects` — list all projects
- [x] `tasks projects add <name>` — create a project
- [x] `tasks projects show <id>` — show project details and its tasks
- [x] Colored output: green for done, yellow for in-progress, red for overdue/high-priority
- [x] Graceful error handling — connection refused, 404s, validation errors shown as readable messages
- [x] `tasks help` and `tasks <command> --help` — usage information for all commands
- [x] `npm run cli` script in package.json as convenience alias

## Acceptance Criteria
- `./bin/tasks list` prints a formatted table of tasks
- `./bin/tasks add "Buy milk" --priority=high` creates a task and prints confirmation
- `./bin/tasks show 1` prints full task detail with tags and project
- `./bin/tasks done 1` sets status to done and prints confirmation
- `./bin/tasks tag 1 urgent` adds the tag and prints confirmation
- `./bin/tasks projects` lists projects in a table
- Running with no args or `tasks help` prints usage info
- All commands exit 0 on success, 1 on error
- Works without any `npm install` — no new dependencies

## Decisions
- No external deps (no commander, no chalk) — use built-in Node.js only
- ANSI escape codes for colors (with NO_COLOR env var support)
- Argument parsing: custom minimal parser, not a framework
- Output tables use fixed-width columns with unicode box chars
- API base URL from TASKS_API env var, default http://localhost:3000
- Delete requires typing "y" to confirm (reads from stdin)

## Constraints
- No interactive/TUI mode (no blessed, no ink)
- No shell completions
- No config file — env vars only
- No offline mode or caching
- Server must be running separately — CLI is a pure API client
