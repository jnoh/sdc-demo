'use strict';

const { post } = require('../lib/http');
const { bold } = require('../lib/output');

async function run(positionals, flags) {
  const title = positionals[0];
  if (!title) {
    throw new Error('Title is required. Usage: tasks add <title>');
  }

  const body = { title };
  if (flags.priority) body.priority = flags.priority;
  if (flags.due) body.due_date = flags.due;
  if (flags.project) body.project_id = Number(flags.project);

  const task = await post('/tasks', body);
  console.log(`Created task #${task.id}: ${task.title}`);
}

function help() {
  console.log([
    bold('tasks add') + ' — create a new task',
    '',
    bold('Usage:') + ' tasks add <title> [options]',
    '',
    bold('Options:'),
    '  --priority=<priority>  Set priority (low, medium, high)',
    '  --due=<date>           Set due date (ISO format)',
    '  --project=<id>         Assign to a project',
  ].join('\n'));
}

module.exports = { run, help };
