'use strict';

// CRITICAL: Set DB_PATH before any require of app/db
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test.db');
process.env.DB_PATH = TEST_DB_PATH;

// Remove test database if it exists so we start fresh
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const app = require('./index');

let server;
let baseUrl;

/**
 * Helper: make an HTTP request and return { status, headers, body }.
 */
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Helper: clear all rows from tasks, task_tags, and tags tables between tests.
 */
function clearTasks() {
  const db = require('./db');
  db.exec('DELETE FROM task_tags');
  db.exec('DELETE FROM tags');
  db.exec('DELETE FROM tasks');
}

describe('Tasks API', () => {
  before((_, done) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(() => {
      // Clean up test database
      if (fs.existsSync(TEST_DB_PATH)) {
        try { fs.unlinkSync(TEST_DB_PATH); } catch { /* ignore */ }
      }
      // Also remove WAL/SHM files if present
      try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch { /* ignore */ }
      try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch { /* ignore */ }
      done();
    });
  });

  beforeEach(() => {
    clearTasks();
  });

  // ---- POST /tasks ----

  describe('POST /tasks', () => {
    it('creates a task and returns 201', async () => {
      const res = await request('POST', '/tasks', { title: 'Buy milk', description: 'From the store' });
      assert.equal(res.status, 201);
      assert.equal(res.body.title, 'Buy milk');
      assert.equal(res.body.description, 'From the store');
      assert.equal(res.body.status, 'todo');
      assert.ok(res.body.id, 'should have an id');
      assert.ok(res.body.created_at, 'should have created_at');
      assert.ok(res.body.updated_at, 'should have updated_at');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request('POST', '/tasks', { description: 'No title here' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'title is required');
    });

    it('creates a task with no description', async () => {
      const res = await request('POST', '/tasks', { title: 'No desc' });
      assert.equal(res.status, 201);
      assert.equal(res.body.title, 'No desc');
      assert.equal(res.body.description, null);
    });
  });

  // ---- GET /tasks ----

  describe('GET /tasks', () => {
    it('returns an empty array when no tasks exist', async () => {
      const res = await request('GET', '/tasks');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });

    it('lists all tasks', async () => {
      await request('POST', '/tasks', { title: 'Task 1' });
      await request('POST', '/tasks', { title: 'Task 2' });
      const res = await request('GET', '/tasks');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 2);
    });

    it('filters tasks by status', async () => {
      await request('POST', '/tasks', { title: 'Task A' });
      const created = await request('POST', '/tasks', { title: 'Task B' });
      // Update Task B to status 'done'
      await request('PATCH', `/tasks/${created.body.id}`, { status: 'done' });

      const res = await request('GET', '/tasks?status=done');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].title, 'Task B');
      assert.equal(res.body[0].status, 'done');
    });

    it('returns empty array when filter matches nothing', async () => {
      await request('POST', '/tasks', { title: 'Task X' });
      const res = await request('GET', '/tasks?status=done');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });
  });

  // ---- GET /tasks sorting ----

  describe('GET /tasks sorting', () => {
    it('returns tasks sorted by created_at ascending', async () => {
      // Insert tasks directly via db with known timestamps to avoid timing issues
      const db = require('./db');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('First', 'todo', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Second', 'todo', '2025-01-02T00:00:00.000Z', '2025-01-02T00:00:00.000Z');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Third', 'todo', '2025-01-03T00:00:00.000Z', '2025-01-03T00:00:00.000Z');

      const res = await request('GET', '/tasks?sort=created_at:asc');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 3);
      assert.equal(res.body[0].title, 'First');
      assert.equal(res.body[1].title, 'Second');
      assert.equal(res.body[2].title, 'Third');
    });

    it('returns tasks sorted by created_at descending', async () => {
      const db = require('./db');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('First', 'todo', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Second', 'todo', '2025-01-02T00:00:00.000Z', '2025-01-02T00:00:00.000Z');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Third', 'todo', '2025-01-03T00:00:00.000Z', '2025-01-03T00:00:00.000Z');

      const res = await request('GET', '/tasks?sort=created_at:desc');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 3);
      assert.equal(res.body[0].title, 'Third');
      assert.equal(res.body[1].title, 'Second');
      assert.equal(res.body[2].title, 'First');
    });

    it('sorts correctly when combined with status filter', async () => {
      const db = require('./db');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Done Early', 'done', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Todo Task', 'todo', '2025-01-02T00:00:00.000Z', '2025-01-02T00:00:00.000Z');
      db.prepare(
        'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Done Late', 'done', '2025-01-03T00:00:00.000Z', '2025-01-03T00:00:00.000Z');

      const res = await request('GET', '/tasks?status=done&sort=created_at:asc');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 2);
      assert.equal(res.body[0].title, 'Done Early');
      assert.equal(res.body[1].title, 'Done Late');
    });
  });

  // ---- GET /tasks/:id ----

  describe('GET /tasks/:id', () => {
    it('returns a task by id', async () => {
      const created = await request('POST', '/tasks', { title: 'Lookup me' });
      const res = await request('GET', `/tasks/${created.body.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.title, 'Lookup me');
      assert.equal(res.body.id, created.body.id);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request('GET', '/tasks/99999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Task not found');
    });
  });

  // ---- PATCH /tasks/:id ----

  describe('PATCH /tasks/:id', () => {
    it('updates a task and returns 200', async () => {
      const created = await request('POST', '/tasks', { title: 'Old title', description: 'Old desc' });
      const res = await request('PATCH', `/tasks/${created.body.id}`, {
        title: 'New title',
        description: 'New desc',
        status: 'in-progress',
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.title, 'New title');
      assert.equal(res.body.description, 'New desc');
      assert.equal(res.body.status, 'in-progress');
      assert.equal(res.body.id, created.body.id);
    });

    it('partially updates a task (only status)', async () => {
      const created = await request('POST', '/tasks', { title: 'Keep me' });
      const res = await request('PATCH', `/tasks/${created.body.id}`, { status: 'done' });
      assert.equal(res.status, 200);
      assert.equal(res.body.title, 'Keep me');
      assert.equal(res.body.status, 'done');
    });

    it('returns 404 when updating non-existent task', async () => {
      const res = await request('PATCH', '/tasks/99999', { title: 'Ghost' });
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Task not found');
    });

    it('returns 400 when status is invalid', async () => {
      const created = await request('POST', '/tasks', { title: 'Validate me' });
      const res = await request('PATCH', `/tasks/${created.body.id}`, { status: 'invalid' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'invalid status');
    });

    it('accepts status "done" as valid', async () => {
      const created = await request('POST', '/tasks', { title: 'Finish me' });
      const res = await request('PATCH', `/tasks/${created.body.id}`, { status: 'done' });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'done');
      assert.equal(res.body.id, created.body.id);
    });
  });

  // ---- DELETE /tasks/:id ----

  describe('DELETE /tasks/:id', () => {
    it('deletes a task and returns 204', async () => {
      const created = await request('POST', '/tasks', { title: 'Delete me' });
      const res = await request('DELETE', `/tasks/${created.body.id}`);
      assert.equal(res.status, 204);

      // Verify it's gone
      const check = await request('GET', `/tasks/${created.body.id}`);
      assert.equal(check.status, 404);
    });

    it('returns 404 when deleting non-existent task', async () => {
      const res = await request('DELETE', '/tasks/99999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Task not found');
    });
  });

  // ---- POST /tasks/:id/tags ----

  describe('POST /tasks/:id/tags', () => {
    it('adds a tag to a task and returns 201', async () => {
      const task = await request('POST', '/tasks', { title: 'Tagged task' });
      const res = await request('POST', `/tasks/${task.body.id}/tags`, { name: 'urgent' });
      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'urgent');
      assert.ok(res.body.id, 'should have a tag id');
    });

    it('normalizes tag name to lowercase and trimmed', async () => {
      const task = await request('POST', '/tasks', { title: 'Tagged task' });
      const res = await request('POST', `/tasks/${task.body.id}/tags`, { name: '  URGENT  ' });
      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'urgent');
    });

    it('returns 404 for non-existent task', async () => {
      const res = await request('POST', '/tasks/99999/tags', { name: 'urgent' });
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Task not found');
    });

    it('returns 400 when name is missing', async () => {
      const task = await request('POST', '/tasks', { title: 'Tagged task' });
      const res = await request('POST', `/tasks/${task.body.id}/tags`, {});
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'name is required');
    });

    it('is idempotent — adding same tag twice does not error', async () => {
      const task = await request('POST', '/tasks', { title: 'Tagged task' });
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'urgent' });
      const res = await request('POST', `/tasks/${task.body.id}/tags`, { name: 'urgent' });
      assert.equal(res.status, 201);

      // Verify no duplicate in task tags
      const taskRes = await request('GET', `/tasks/${task.body.id}`);
      const urgentTags = taskRes.body.tags.filter(t => t.name === 'urgent');
      assert.equal(urgentTags.length, 1);
    });
  });

  // ---- DELETE /tasks/:id/tags/:tagName ----

  describe('DELETE /tasks/:id/tags/:tagName', () => {
    it('removes a tag from a task and returns 204', async () => {
      const task = await request('POST', '/tasks', { title: 'Tagged task' });
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'urgent' });

      const res = await request('DELETE', `/tasks/${task.body.id}/tags/urgent`);
      assert.equal(res.status, 204);

      // Verify tag is removed from task
      const taskRes = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(taskRes.body.tags.length, 0);
    });

    it('tag itself remains after removal from task', async () => {
      const task = await request('POST', '/tasks', { title: 'Tagged task' });
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'urgent' });
      await request('DELETE', `/tasks/${task.body.id}/tags/urgent`);

      // Tag should still exist in GET /tags
      const tagsRes = await request('GET', '/tags');
      const urgent = tagsRes.body.find(t => t.name === 'urgent');
      assert.ok(urgent, 'tag should still exist');
    });

    it('returns 404 for non-existent task', async () => {
      const res = await request('DELETE', '/tasks/99999/tags/urgent');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Task not found');
    });
  });

  // ---- GET /tags ----

  describe('GET /tags', () => {
    it('returns all tags with task counts', async () => {
      const task1 = await request('POST', '/tasks', { title: 'Task 1' });
      const task2 = await request('POST', '/tasks', { title: 'Task 2' });
      await request('POST', `/tasks/${task1.body.id}/tags`, { name: 'urgent' });
      await request('POST', `/tasks/${task2.body.id}/tags`, { name: 'urgent' });
      await request('POST', `/tasks/${task1.body.id}/tags`, { name: 'bug' });

      const res = await request('GET', '/tags');
      assert.equal(res.status, 200);
      const urgent = res.body.find(t => t.name === 'urgent');
      const bug = res.body.find(t => t.name === 'bug');
      assert.equal(urgent.taskCount, 2);
      assert.equal(bug.taskCount, 1);
    });

    it('returns empty array when no tags exist', async () => {
      const res = await request('GET', '/tags');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });
  });

  // ---- GET /tasks?tag= filter ----

  describe('GET /tasks?tag= filter', () => {
    it('filters tasks by tag', async () => {
      const task1 = await request('POST', '/tasks', { title: 'Task 1' });
      const task2 = await request('POST', '/tasks', { title: 'Task 2' });
      await request('POST', `/tasks/${task1.body.id}/tags`, { name: 'urgent' });

      const res = await request('GET', '/tasks?tag=urgent');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].title, 'Task 1');
    });

    it('returns empty array when no tasks have the tag', async () => {
      await request('POST', '/tasks', { title: 'Task 1' });
      const res = await request('GET', '/tasks?tag=nonexistent');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });
  });

  // ---- GET /tasks/:id includes tags ----

  describe('GET /tasks/:id includes tags', () => {
    it('includes tags array in response', async () => {
      const task = await request('POST', '/tasks', { title: 'Tagged task' });
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'urgent' });
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'bug' });

      const res = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.tags), 'tags should be an array');
      assert.equal(res.body.tags.length, 2);
      const tagNames = res.body.tags.map(t => t.name).sort();
      assert.deepEqual(tagNames, ['bug', 'urgent']);
    });

    it('includes empty tags array when task has no tags', async () => {
      const task = await request('POST', '/tasks', { title: 'No tags' });
      const res = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.tags), 'tags should be an array');
      assert.equal(res.body.tags.length, 0);
    });
  });

  // ---- Priority field ----

  describe('Priority field', () => {
    it('creates a task with priority and returns 201', async () => {
      const res = await request('POST', '/tasks', { title: 'High priority', priority: 'high' });
      assert.equal(res.status, 201);
      assert.equal(res.body.priority, 'high');
    });

    it('defaults priority to medium when not specified', async () => {
      const res = await request('POST', '/tasks', { title: 'Default priority' });
      assert.equal(res.status, 201);
      assert.equal(res.body.priority, 'medium');
    });

    it('returns 400 for invalid priority on create', async () => {
      const res = await request('POST', '/tasks', { title: 'Bad priority', priority: 'critical' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'invalid priority');
    });

    it('updates priority via PATCH', async () => {
      const created = await request('POST', '/tasks', { title: 'Change priority' });
      const res = await request('PATCH', `/tasks/${created.body.id}`, { priority: 'low' });
      assert.equal(res.status, 200);
      assert.equal(res.body.priority, 'low');
    });

    it('returns 400 for invalid priority on update', async () => {
      const created = await request('POST', '/tasks', { title: 'Validate priority' });
      const res = await request('PATCH', `/tasks/${created.body.id}`, { priority: 'invalid' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'invalid priority');
    });

    it('filters tasks by priority', async () => {
      await request('POST', '/tasks', { title: 'High 1', priority: 'high' });
      await request('POST', '/tasks', { title: 'Low 1', priority: 'low' });
      await request('POST', '/tasks', { title: 'High 2', priority: 'high' });

      const res = await request('GET', '/tasks?priority=high');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 2);
      assert.ok(res.body.every(t => t.priority === 'high'));
    });

    it('returns empty array when no tasks match priority filter', async () => {
      await request('POST', '/tasks', { title: 'Medium task' });
      const res = await request('GET', '/tasks?priority=high');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });
  });

  // ---- Due date field ----

  describe('Due date field', () => {
    it('creates a task with due_date and returns 201', async () => {
      const res = await request('POST', '/tasks', { title: 'Due task', due_date: '2026-04-01T00:00:00Z' });
      assert.equal(res.status, 201);
      assert.equal(res.body.due_date, '2026-04-01T00:00:00Z');
    });

    it('defaults due_date to null when not specified', async () => {
      const res = await request('POST', '/tasks', { title: 'No due date' });
      assert.equal(res.status, 201);
      assert.equal(res.body.due_date, null);
    });

    it('updates due_date via PATCH', async () => {
      const created = await request('POST', '/tasks', { title: 'Update due date' });
      const res = await request('PATCH', `/tasks/${created.body.id}`, { due_date: '2026-05-01T00:00:00Z' });
      assert.equal(res.status, 200);
      assert.equal(res.body.due_date, '2026-05-01T00:00:00Z');
    });

    it('filters overdue tasks', async () => {
      const db = require('./db');
      const pastDate = '2020-01-01T00:00:00Z';
      const futureDate = '2099-12-31T00:00:00Z';
      const now = new Date().toISOString();

      // Overdue task (past due_date, not done)
      db.prepare(
        'INSERT INTO tasks (title, status, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('Overdue task', 'todo', 'medium', pastDate, now, now);

      // Not overdue (future due_date)
      db.prepare(
        'INSERT INTO tasks (title, status, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('Future task', 'todo', 'medium', futureDate, now, now);

      // Not overdue (past due_date but done)
      db.prepare(
        'INSERT INTO tasks (title, status, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('Done task', 'done', 'medium', pastDate, now, now);

      // No due date
      db.prepare(
        'INSERT INTO tasks (title, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run('No date task', 'todo', 'medium', now, now);

      const res = await request('GET', '/tasks?overdue=true');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].title, 'Overdue task');
    });

    it('overdue filter returns empty when no tasks are overdue', async () => {
      await request('POST', '/tasks', { title: 'Future task', due_date: '2099-12-31T00:00:00Z' });
      const res = await request('GET', '/tasks?overdue=true');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });
  });

  // ---- GET /tasks/:id enriched response (tags AND project) ----

  describe('GET /tasks/:id enriched response', () => {
    it('includes both tags and project in response', async () => {
      // Create a project
      const project = await request('POST', '/projects', { name: 'Sprint 1', description: 'First sprint' });

      // Create a task and assign to project
      const task = await request('POST', '/tasks', { title: 'Enriched task', priority: 'high', due_date: '2026-04-01T00:00:00Z' });
      await request('PATCH', `/tasks/${task.body.id}`, { project_id: project.body.id });

      // Add tags
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'urgent' });
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'backend' });

      // Fetch enriched response
      const res = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(res.status, 200);

      // Verify tags
      assert.ok(Array.isArray(res.body.tags), 'tags should be an array');
      assert.equal(res.body.tags.length, 2);
      const tagNames = res.body.tags.map(t => t.name).sort();
      assert.deepEqual(tagNames, ['backend', 'urgent']);
      assert.ok(res.body.tags[0].id, 'each tag should have an id');

      // Verify project
      assert.ok(res.body.project, 'should have project object');
      assert.equal(res.body.project.id, project.body.id);
      assert.equal(res.body.project.name, 'Sprint 1');
      assert.equal(res.body.project.description, 'First sprint');

      // Verify other v2 fields
      assert.equal(res.body.priority, 'high');
      assert.equal(res.body.due_date, '2026-04-01T00:00:00Z');
    });

    it('includes tags and null project when task has no project', async () => {
      const task = await request('POST', '/tasks', { title: 'Tags only task' });
      await request('POST', `/tasks/${task.body.id}/tags`, { name: 'solo' });

      const res = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.tags));
      assert.equal(res.body.tags.length, 1);
      assert.equal(res.body.tags[0].name, 'solo');
      assert.equal(res.body.project, null);
    });
  });
});
