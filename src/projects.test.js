'use strict';

// CRITICAL: Set DB_PATH before any require of app/db
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test-projects.db');
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
 * Helper: clear all rows from projects and tasks tables between tests.
 */
function clearAll() {
  const db = require('./db');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM projects');
}

describe('Projects API', () => {
  before((_, done) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(() => {
      if (fs.existsSync(TEST_DB_PATH)) {
        try { fs.unlinkSync(TEST_DB_PATH); } catch { /* ignore */ }
      }
      try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch { /* ignore */ }
      try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch { /* ignore */ }
      done();
    });
  });

  beforeEach(() => {
    clearAll();
  });

  // ---- POST /projects ----

  describe('POST /projects', () => {
    it('creates a project with name only and returns 201', async () => {
      const res = await request('POST', '/projects', { name: 'Q1 Sprint' });
      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'Q1 Sprint');
      assert.equal(res.body.description, null);
      assert.ok(res.body.id, 'should have an id');
      assert.ok(res.body.created_at, 'should have created_at');
    });

    it('creates a project with name and description and returns 201', async () => {
      const res = await request('POST', '/projects', { name: 'Q1 Sprint', description: 'Sprint planning' });
      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'Q1 Sprint');
      assert.equal(res.body.description, 'Sprint planning');
    });

    it('returns 400 when name is missing', async () => {
      const res = await request('POST', '/projects', { description: 'No name here' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'name is required');
    });
  });

  // ---- GET /projects ----

  describe('GET /projects', () => {
    it('returns an empty array when no projects exist', async () => {
      const res = await request('GET', '/projects');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });

    it('lists all projects', async () => {
      await request('POST', '/projects', { name: 'Project 1' });
      await request('POST', '/projects', { name: 'Project 2' });
      const res = await request('GET', '/projects');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 2);
    });
  });

  // ---- GET /projects/:id ----

  describe('GET /projects/:id', () => {
    it('returns a project by id', async () => {
      const created = await request('POST', '/projects', { name: 'Lookup me' });
      const res = await request('GET', `/projects/${created.body.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'Lookup me');
      assert.equal(res.body.id, created.body.id);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request('GET', '/projects/99999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Project not found');
    });
  });

  // ---- PATCH /projects/:id ----

  describe('PATCH /projects/:id', () => {
    it('updates a project and returns 200', async () => {
      const created = await request('POST', '/projects', { name: 'Old name', description: 'Old desc' });
      const res = await request('PATCH', `/projects/${created.body.id}`, { name: 'Updated' });
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'Updated');
      assert.equal(res.body.description, 'Old desc');
    });

    it('returns 404 when updating non-existent project', async () => {
      const res = await request('PATCH', '/projects/99999', { name: 'Ghost' });
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Project not found');
    });
  });

  // ---- DELETE /projects/:id ----

  describe('DELETE /projects/:id', () => {
    it('deletes a project and returns 204', async () => {
      const created = await request('POST', '/projects', { name: 'Delete me' });
      const res = await request('DELETE', `/projects/${created.body.id}`);
      assert.equal(res.status, 204);

      const check = await request('GET', `/projects/${created.body.id}`);
      assert.equal(check.status, 404);
    });

    it('returns 404 when deleting non-existent project', async () => {
      const res = await request('DELETE', '/projects/99999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Project not found');
    });

    it('sets tasks project_id to null when project is deleted', async () => {
      const project = await request('POST', '/projects', { name: 'Will be deleted' });
      const task = await request('POST', '/tasks', { title: 'Orphan task' });
      await request('PATCH', `/tasks/${task.body.id}`, { project_id: project.body.id });

      // Delete the project
      await request('DELETE', `/projects/${project.body.id}`);

      // Task should still exist but with project_id = null
      const updatedTask = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(updatedTask.status, 200);
      assert.equal(updatedTask.body.project_id, null);
      assert.equal(updatedTask.body.project, null);
    });
  });

  // ---- GET /projects/:id/tasks ----

  describe('GET /projects/:id/tasks', () => {
    it('returns tasks belonging to a project', async () => {
      const project = await request('POST', '/projects', { name: 'My Project' });
      const task1 = await request('POST', '/tasks', { title: 'Task A' });
      const task2 = await request('POST', '/tasks', { title: 'Task B' });
      await request('PATCH', `/tasks/${task1.body.id}`, { project_id: project.body.id });
      await request('PATCH', `/tasks/${task2.body.id}`, { project_id: project.body.id });

      const res = await request('GET', `/projects/${project.body.id}/tasks`);
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 2);
    });

    it('returns empty array when project has no tasks', async () => {
      const project = await request('POST', '/projects', { name: 'Empty Project' });
      const res = await request('GET', `/projects/${project.body.id}/tasks`);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await request('GET', '/projects/99999/tasks');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Project not found');
    });
  });

  // ---- Task-Project integration ----

  describe('Task-Project integration', () => {
    it('assigns a task to a project via PATCH /tasks/:id', async () => {
      const project = await request('POST', '/projects', { name: 'Sprint 1' });
      const task = await request('POST', '/tasks', { title: 'Do something' });

      const res = await request('PATCH', `/tasks/${task.body.id}`, { project_id: project.body.id });
      assert.equal(res.status, 200);
      assert.equal(res.body.project_id, project.body.id);
    });

    it('unassigns a task from a project via PATCH /tasks/:id with project_id null', async () => {
      const project = await request('POST', '/projects', { name: 'Sprint 1' });
      const task = await request('POST', '/tasks', { title: 'Do something' });
      await request('PATCH', `/tasks/${task.body.id}`, { project_id: project.body.id });

      const res = await request('PATCH', `/tasks/${task.body.id}`, { project_id: null });
      assert.equal(res.status, 200);
      assert.equal(res.body.project_id, null);
    });

    it('GET /tasks/:id includes project object when assigned', async () => {
      const project = await request('POST', '/projects', { name: 'Sprint 1', description: 'First sprint' });
      const task = await request('POST', '/tasks', { title: 'Do something' });
      await request('PATCH', `/tasks/${task.body.id}`, { project_id: project.body.id });

      const res = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.project, 'should have project object');
      assert.equal(res.body.project.id, project.body.id);
      assert.equal(res.body.project.name, 'Sprint 1');
      assert.equal(res.body.project.description, 'First sprint');
      assert.ok(res.body.project.created_at, 'project should have created_at');
    });

    it('GET /tasks/:id includes project: null when not assigned', async () => {
      const task = await request('POST', '/tasks', { title: 'No project' });

      const res = await request('GET', `/tasks/${task.body.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.project, null);
    });
  });
});
