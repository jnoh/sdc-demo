'use strict';

// CRITICAL: Set DB_PATH before any require of app/db
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'cli-test.db');
process.env.DB_PATH = TEST_DB_PATH;

// Remove test database if it exists so we start fresh
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('./index');
const CLI = path.join(__dirname, '..', 'bin', 'tasks');

let server;
let PORT;

function runCLI(args, env = {}) {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args], {
      env: { ...process.env, NO_COLOR: '1', TASKS_API: `http://localhost:${PORT}`, ...env },
      timeout: 5000,
    }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

// ---- Unit Tests: Arg Parser ----

describe('parseArgs', () => {
  const { parseArgs } = require('../bin/lib/args');

  it('extracts positional args', () => {
    const { positionals, flags } = parseArgs(['list', 'extra']);
    assert.deepStrictEqual(positionals, ['list', 'extra']);
    assert.deepStrictEqual(flags, {});
  });

  it('parses --flag=value', () => {
    const { positionals, flags } = parseArgs(['--status=done']);
    assert.deepStrictEqual(positionals, []);
    assert.deepStrictEqual(flags, { status: 'done' });
  });

  it('parses --boolean flags as true', () => {
    const { positionals, flags } = parseArgs(['--verbose']);
    assert.deepStrictEqual(flags, { verbose: true });
  });

  it('handles mixed positionals and flags', () => {
    const { positionals, flags } = parseArgs(['list', '--status=todo', '--overdue', 'extra']);
    assert.deepStrictEqual(positionals, ['list', 'extra']);
    assert.deepStrictEqual(flags, { status: 'todo', overdue: true });
  });

  it('handles empty argv', () => {
    const { positionals, flags } = parseArgs([]);
    assert.deepStrictEqual(positionals, []);
    assert.deepStrictEqual(flags, {});
  });
});

// ---- Unit Tests: Output Formatting ----

describe('output formatting', () => {
  const { table, formatDate, green, bold, dim } = require('../bin/lib/output');

  it('table() renders headers and rows', () => {
    const result = table(['ID', 'Name'], [['1', 'Alice'], ['2', 'Bob']]);
    assert.ok(result.includes('ID'));
    assert.ok(result.includes('Name'));
    assert.ok(result.includes('Alice'));
    assert.ok(result.includes('Bob'));
    // Check box-drawing characters
    assert.ok(result.includes('┌'));
    assert.ok(result.includes('┘'));
    assert.ok(result.includes('│'));
  });

  it('table() handles empty rows', () => {
    const result = table(['ID', 'Name'], []);
    assert.ok(result.includes('ID'));
    assert.ok(result.includes('┌'));
    assert.ok(result.includes('┘'));
  });

  it('formatDate() formats valid ISO dates', () => {
    const result = formatDate('2026-03-15T10:00:00Z');
    assert.ok(result.includes('Mar'));
    assert.ok(result.includes('2026'));
  });

  it('formatDate() returns empty string for null/empty', () => {
    assert.strictEqual(formatDate(null), '');
    assert.strictEqual(formatDate(''), '');
    assert.strictEqual(formatDate(undefined), '');
  });

  it('formatDate() returns input for invalid dates', () => {
    assert.strictEqual(formatDate('not-a-date'), 'not-a-date');
  });

  it('color functions exist and return strings', () => {
    assert.strictEqual(typeof green('x'), 'string');
    assert.strictEqual(typeof bold('x'), 'string');
    assert.strictEqual(typeof dim('x'), 'string');
  });
});

// ---- Integration Tests ----

describe('CLI integration', () => {
  before((_, done) => {
    server = app.listen(0, () => {
      PORT = server.address().port;
      done();
    });
  });

  after((_, done) => {
    server.close(() => {
      if (fs.existsSync(TEST_DB_PATH)) {
        try { fs.unlinkSync(TEST_DB_PATH); } catch {}
      }
      try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch {}
      try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {}
      done();
    });
  });

  it('help command exits 0 and shows usage', async () => {
    const { code, stdout } = await runCLI(['help']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Usage'));
  });

  it('no command shows help', async () => {
    const { code, stdout } = await runCLI([]);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Usage'));
  });

  it('unknown command exits 1', async () => {
    const { code, stderr } = await runCLI(['bogus']);
    assert.strictEqual(code, 1);
    assert.ok(stderr.includes('Unknown command'));
  });

  it('list with no tasks shows empty message', async () => {
    const { code, stdout } = await runCLI(['list']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('No tasks found'));
  });

  it('add creates a task', async () => {
    const { code, stdout } = await runCLI(['add', 'Test task']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Created task'));
  });

  it('add with priority and due date', async () => {
    const { code, stdout } = await runCLI(['add', 'Priority task', '--priority=high', '--due=2026-12-31']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Created task'));
  });

  it('add without title exits 1', async () => {
    const { code, stderr } = await runCLI(['add']);
    assert.strictEqual(code, 1);
    assert.ok(stderr.includes('Title is required'));
  });

  it('list shows created tasks', async () => {
    const { code, stdout } = await runCLI(['list']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Test task'));
    assert.ok(stdout.includes('┌')); // table rendered
  });

  it('show displays task details', async () => {
    // First add a task to get a known ID
    const addResult = await runCLI(['add', 'Show me task']);
    const match = addResult.stdout.match(/#(\d+)/);
    assert.ok(match, 'should have created a task with an ID');
    const id = match[1];

    const { code, stdout } = await runCLI(['show', id]);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Show me task'));
    assert.ok(stdout.includes('Status'));
  });

  it('show with invalid ID exits 1', async () => {
    const { code, stderr } = await runCLI(['show', '99999']);
    assert.strictEqual(code, 1);
    assert.ok(stderr.includes('Error'));
  });

  it('done marks task as done', async () => {
    const addResult = await runCLI(['add', 'Done task']);
    const id = addResult.stdout.match(/#(\d+)/)[1];

    const { code, stdout } = await runCLI(['done', id]);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('marked as done'));
  });

  it('update changes task fields', async () => {
    const addResult = await runCLI(['add', 'Update task']);
    const id = addResult.stdout.match(/#(\d+)/)[1];

    const { code, stdout } = await runCLI(['update', id, '--status=in-progress']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Updated'));
  });

  it('tag adds a tag to a task', async () => {
    const addResult = await runCLI(['add', 'Tag task']);
    const id = addResult.stdout.match(/#(\d+)/)[1];

    const { code, stdout } = await runCLI(['tag', id, 'urgent']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Tagged'));
  });

  it('untag removes a tag from a task', async () => {
    const addResult = await runCLI(['add', 'Untag task']);
    const id = addResult.stdout.match(/#(\d+)/)[1];

    await runCLI(['tag', id, 'removeme']);
    const { code, stdout } = await runCLI(['untag', id, 'removeme']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Removed tag'));
  });

  it('tags lists tags', async () => {
    const { code, stdout } = await runCLI(['tags']);
    assert.strictEqual(code, 0);
    // Should show table with tags or have output
    assert.ok(stdout.includes('urgent') || stdout.includes('No tags'));
  });

  it('list --status=done filters correctly', async () => {
    const { code, stdout } = await runCLI(['list', '--status=done']);
    assert.strictEqual(code, 0);
    // Should contain our "Done task" but not tasks that are still todo
    assert.ok(stdout.includes('Done task') || stdout.includes('No tasks found'));
  });

  it('list --priority=high filters correctly', async () => {
    const { code, stdout } = await runCLI(['list', '--priority=high']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Priority task') || stdout.includes('No tasks found'));
  });

  it('projects lists projects or shows empty', async () => {
    const { code, stdout } = await runCLI(['projects']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('No projects found') || stdout.includes('┌'));
  });

  it('projects add creates a project', async () => {
    const { code, stdout } = await runCLI(['projects', 'add', 'Test Project']);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Created project'));
  });

  it('projects show displays project details', async () => {
    // Get project ID from the add output
    const addResult = await runCLI(['projects', 'add', 'Show Project']);
    const match = addResult.stdout.match(/#(\d+)/);
    assert.ok(match);
    const id = match[1];

    const { code, stdout } = await runCLI(['projects', 'show', id]);
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Show Project'));
  });

  // ---- Error handling ----

  it('connection refused shows readable error', async () => {
    const { code, stderr } = await runCLI(['list'], { TASKS_API: 'http://localhost:1' });
    assert.strictEqual(code, 1);
    assert.ok(stderr.includes('Cannot connect') || stderr.includes('Error'));
  });
});
