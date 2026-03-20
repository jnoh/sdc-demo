'use strict';

const { get } = require('../lib/http');
const { green, yellow, red, bold, table, formatDate } = require('../lib/output');

function colorStatus(status) {
  if (status === 'done') return green(status);
  if (status === 'in-progress') return yellow(status);
  return status;
}

function colorPriority(priority) {
  if (priority === 'high') return red(priority);
  return priority || '';
}

async function run(positionals, flags) {
  const params = [];

  if (flags.status) params.push(`status=${encodeURIComponent(flags.status)}`);
  if (flags.priority) params.push(`priority=${encodeURIComponent(flags.priority)}`);
  if (flags.tag) params.push(`tag=${encodeURIComponent(flags.tag)}`);
  if (flags.overdue) params.push('overdue=true');
  if (flags.sort) params.push(`sort=${encodeURIComponent(flags.sort)}`);

  const query = params.length ? '?' + params.join('&') : '';
  const tasks = await get(`/tasks${query}`);

  if (!tasks.length) {
    console.log('No tasks found.');
    return;
  }

  const headers = ['ID', 'Title', 'Status', 'Priority', 'Due Date'];
  const rows = tasks.map(t => [
    String(t.id),
    t.title,
    colorStatus(t.status),
    colorPriority(t.priority),
    formatDate(t.due_date),
  ]);

  console.log(table(headers, rows));
}

function help() {
  console.log([
    bold('tasks list') + ' — list all tasks',
    '',
    bold('Usage:') + ' tasks list [options]',
    '',
    bold('Options:'),
    '  --status=<status>      Filter by status (todo, in-progress, done)',
    '  --priority=<priority>  Filter by priority (low, medium, high)',
    '  --tag=<tag>            Filter by tag name',
    '  --overdue              Show only overdue tasks',
    '  --sort=<field:dir>     Sort results (e.g. created_at:desc)',
  ].join('\n'));
}

module.exports = { run, help };
