# Database

## Requirements
- [x] SQLite database using better-sqlite3
- [x] Tasks table: id, title, description, status (todo/in-progress/done), created_at, updated_at
- [x] Database module that exports a configured db instance
- [x] Schema auto-creates on first run (no migration tool needed)
- [x] Add priority column to tasks (low, medium, high) — default: medium
- [x] Add due_date column to tasks (ISO string, nullable)
- [x] Add tags table: id, name (unique)
- [x] Add task_tags join table: task_id, tag_id (composite primary key, foreign keys)
- [x] Add projects table: id, name, description, created_at
- [x] Add project_id foreign key column to tasks (nullable)

## Acceptance Criteria
- `require('./db')` returns a ready-to-use better-sqlite3 instance
- All tables exist with correct columns after first import
- Database file lives at `data/tasks.db`
- data/ directory is gitignored
- Foreign keys enforced (PRAGMA foreign_keys = ON)

## Decisions
- Use better-sqlite3 (synchronous, no async complexity)
- Single `db.js` module, no ORM
- WAL mode enabled for better concurrency
- All new columns added via CREATE TABLE IF NOT EXISTS (fresh schema, no ALTER TABLE migrations)

## Constraints
- No migration framework — just CREATE IF NOT EXISTS
- No seed data
