const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /tasks — list all tasks, optional ?status= filter
router.get('/', (req, res) => {
  const { status } = req.query;

  if (status) {
    const tasks = db.prepare('SELECT * FROM tasks WHERE status = ?').all(status);
    return res.json(tasks);
  }

  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);
});

// POST /tasks — create a task
router.post('/', (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO tasks (title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description || null, 'todo', now, now);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// GET /tasks/:id — get a single task
router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// PATCH /tasks/:id — update title, description, or status
router.patch('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, description, status } = req.body;
  const now = new Date().toISOString();

  const updatedTitle = title !== undefined ? title : task.title;
  const updatedDescription = description !== undefined ? description : task.description;
  const updatedStatus = status !== undefined ? status : task.status;

  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?'
  ).run(updatedTitle, updatedDescription, updatedStatus, now, req.params.id);

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updatedTask);
});

// DELETE /tasks/:id — delete a task
router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
