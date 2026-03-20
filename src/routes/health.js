'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    taskCount: count
  });
});

module.exports = router;
