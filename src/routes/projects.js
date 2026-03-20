const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /projects — list all projects
router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

// POST /projects — create a project
router.post('/', (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO projects (name, description, created_at) VALUES (?, ?, ?)'
  ).run(name, description || null, now);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// GET /projects/:id — get a single project
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json(project);
});

// PATCH /projects/:id — update a project
router.patch('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, description } = req.body;

  const updatedName = name !== undefined ? name : project.name;
  const updatedDescription = description !== undefined ? description : project.description;

  db.prepare(
    'UPDATE projects SET name = ?, description = ? WHERE id = ?'
  ).run(updatedName, updatedDescription, req.params.id);

  const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(updatedProject);
});

// DELETE /projects/:id — delete a project
router.delete('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// GET /projects/:id/tasks — list tasks belonging to a project
router.get('/:id/tasks', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.id);
  res.json(tasks);
});

module.exports = router;
