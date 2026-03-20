'use strict';

const { patch } = require('../lib/http');
const { bold } = require('../lib/output');

async function run(positionals, flags) {
  const id = positionals[0];
  if (!id) {
    throw new Error('Task ID is required. Usage: tasks update <id> [options]');
  }

  const body = {};
  if (flags.title) body.title = flags.title;
  if (flags.status) body.status = flags.status;
  if (flags.priority) body.priority = flags.priority;
  if (flags.due) body.due_date = flags.due;
  if (flags.project) body.project_id = Number(flags.project);

  if (Object.keys(body).length === 0) {
    throw new Error('No fields to update. Use --title, --status, --priority, --due, or --project.');
  }

  const task = await patch(`/tasks/${id}`, body);
  console.log(`Updated task #${task.id}: ${task.title}`);
}

function help() {
  console.log([
    bold('tasks update') + ' — update a task',
    '',
    bold('Usage:') + ' tasks update <id> [options]',
    '',
    bold('Options:'),
    '  --title=<title>        Update title',
    '  --status=<status>      Update status (todo, in-progress, done)',
    '  --priority=<priority>  Update priority (low, medium, high)',
    '  --due=<date>           Update due date (ISO format)',
    '  --project=<id>         Update project assignment',
  ].join('\n'));
}

module.exports = { run, help };
