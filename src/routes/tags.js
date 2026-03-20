'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /tags — list all tags with task counts
router.get('/', (req, res) => {
  const tags = db.prepare(`
    SELECT tags.id, tags.name, COUNT(task_tags.task_id) AS taskCount
    FROM tags
    LEFT JOIN task_tags ON tags.id = task_tags.tag_id
    GROUP BY tags.id
  `).all();
  res.json(tags);
});

module.exports = router;
