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
 * Helper: clear all rows from the tasks table between tests.
 */
function clearTasks() {
  const db = require('./db');
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
});
