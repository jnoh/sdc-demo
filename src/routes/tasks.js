const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * Helper: get tags for a task as an array of {id, name}.
 */
function getTagsForTask(taskId) {
  return db.prepare(`
    SELECT tags.id, tags.name
    FROM tags
    JOIN task_tags ON tags.id = task_tags.tag_id
    WHERE task_tags.task_id = ?
  `).all(taskId);
}

// GET /tasks — list all tasks, optional filters and sorting
router.get('/', (req, res) => {
  const { status, sort, priority, overdue, tag } = req.query;

  let sql = 'SELECT tasks.*';
  const params = [];
  const joins = [];
  const conditions = [];

  if (tag) {
    joins.push('JOIN task_tags ON tasks.id = task_tags.task_id');
    joins.push('JOIN tags ON task_tags.tag_id = tags.id');
    conditions.push('tags.name = ?');
    params.push(tag);
  }

  sql += ' FROM tasks';
  if (joins.length) {
    sql += ' ' + joins.join(' ');
  }

  if (status) {
    conditions.push('tasks.status = ?');
    params.push(status);
  }

  if (priority) {
    conditions.push('tasks.priority = ?');
    params.push(priority);
  }

  if (overdue === 'true') {
    conditions.push('tasks.due_date < ?');
    conditions.push('tasks.status != ?');
    params.push(new Date().toISOString());
    params.push('done');
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  if (sort) {
    const [column, direction] = sort.split(':');
    if (column === 'created_at' && (direction === 'asc' || direction === 'desc')) {
      sql += ` ORDER BY tasks.created_at ${direction.toUpperCase()}`;
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

// GET /tasks/:id — get a single task (includes tags array)
router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.tags = getTagsForTask(task.id);

  let project = null;
  if (task.project_id) {
    project = db.prepare('SELECT id, name, description, created_at FROM projects WHERE id = ?').get(task.project_id);
  }
  task.project = project;

  res.json(task);
});

// PATCH /tasks/:id — update title, description, status, priority, due_date
router.patch('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, description, status, priority, due_date, project_id } = req.body;

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
  const updatedProjectId = project_id !== undefined ? project_id : task.project_id;

  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, project_id = ?, updated_at = ? WHERE id = ?'
  ).run(updatedTitle, updatedDescription, updatedStatus, updatedPriority, updatedDueDate, updatedProjectId, now, req.params.id);

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

// POST /tasks/:id/tags — add a tag to a task
router.post('/:id/tags', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const normalized = name.trim().toLowerCase();

  // Create tag if it doesn't exist
  db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(normalized);
  const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(normalized);

  // Link tag to task (idempotent)
  db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(task.id, tag.id);

  res.status(201).json({ id: tag.id, name: tag.name });
});

// DELETE /tasks/:id/tags/:tagName — remove a tag from a task
router.delete('/:id/tags/:tagName', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const normalized = req.params.tagName.trim().toLowerCase();
  const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(normalized);

  if (tag) {
    db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(task.id, tag.id);
  }

  res.status(204).send();
});

module.exports = router;
