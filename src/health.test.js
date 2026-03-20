'use strict';

// CRITICAL: Set DB_PATH before any require of app/db
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test-health.db');
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
 * Helper: clear all rows from tasks table.
 */
function clearTasks() {
  const db = require('./db');
  db.exec('DELETE FROM task_tags');
  db.exec('DELETE FROM tags');
  db.exec('DELETE FROM tasks');
}

describe('Health API', () => {
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
    clearTasks();
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request('GET', '/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });

    it('includes uptime as a number', async () => {
      const res = await request('GET', '/health');
      assert.equal(res.status, 200);
      assert.equal(typeof res.body.uptime, 'number');
      assert.ok(res.body.uptime >= 0, 'uptime should be non-negative');
    });

    it('includes taskCount as a number', async () => {
      const res = await request('GET', '/health');
      assert.equal(res.status, 200);
      assert.equal(typeof res.body.taskCount, 'number');
    });

    it('returns correct taskCount of 0 when no tasks exist', async () => {
      const res = await request('GET', '/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.taskCount, 0);
    });

    it('returns correct taskCount after creating tasks', async () => {
      await request('POST', '/tasks', { title: 'Task 1' });
      await request('POST', '/tasks', { title: 'Task 2' });
      await request('POST', '/tasks', { title: 'Task 3' });

      const res = await request('GET', '/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.taskCount, 3);
    });

    it('returns all three expected fields', async () => {
      const res = await request('GET', '/health');
      assert.equal(res.status, 200);
      assert.ok('status' in res.body, 'should have status field');
      assert.ok('uptime' in res.body, 'should have uptime field');
      assert.ok('taskCount' in res.body, 'should have taskCount field');
    });
  });
});
