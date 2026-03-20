# Database

## Requirements
- [x] SQLite database using better-sqlite3
- [x] Tasks table: id, title, description, status (todo/in-progress/done), created_at, updated_at
- [x] Database module that exports a configured db instance
- [x] Schema auto-creates on first run (no migration tool needed)

## Acceptance Criteria
- `require('./db')` returns a ready-to-use better-sqlite3 instance
- Tasks table exists with correct columns after first import
- Database file lives at `data/tasks.db`
- data/ directory is gitignored

## Decisions
- Use better-sqlite3 (synchronous, no async complexity)
- Single `db.js` module, no ORM
- WAL mode enabled for better concurrency

## Constraints
- No migration framework — just CREATE IF NOT EXISTS
- No seed data
