const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /tasks — list all tasks, optional filters and sorting
router.get('/', (req, res) => {
  const { status, sort, priority, overdue } = req.query;

  let sql = 'SELECT * FROM tasks';
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (priority) {
    conditions.push('priority = ?');
    params.push(priority);
  }

  if (overdue === 'true') {
    conditions.push('due_date < ?');
    conditions.push('status != ?');
    params.push(new Date().toISOString());
    params.push('done');
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  if (sort) {
    const [column, direction] = sort.split(':');
    if (column === 'created_at' && (direction === 'asc' || direction === 'desc')) {
      sql += ` ORDER BY created_at ${direction.toUpperCase()}`;
    }
  }

  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

// POST /tasks — create a task
router.post('/', (req, res) => {
  const { title, description, priority, due_date } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority !== undefined && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'invalid priority' });
  }

  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO tasks (title, description, status, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, description || null, 'todo', priority || 'medium', due_date || null, now, now);

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

  const { title, description, status, priority, due_date } = req.body;

  const validStatuses = ['todo', 'in-progress', 'done'];
  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (priority !== undefined && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'invalid priority' });
  }

  const now = new Date().toISOString();

  const updatedTitle = title !== undefined ? title : task.title;
  const updatedDescription = description !== undefined ? description : task.description;
  const updatedStatus = status !== undefined ? status : task.status;
  const updatedPriority = priority !== undefined ? priority : task.priority;
  const updatedDueDate = due_date !== undefined ? due_date : task.due_date;

  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = ? WHERE id = ?'
  ).run(updatedTitle, updatedDescription, updatedStatus, updatedPriority, updatedDueDate, now, req.params.id);

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
