'use strict';

const { get } = require('../lib/http');
const { green, yellow, red, bold, dim, formatDate } = require('../lib/output');

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
  const id = positionals[0];
  if (!id) {
    throw new Error('Task ID is required. Usage: tasks show <id>');
  }

  const task = await get(`/tasks/${id}`);

  const lines = [
    `${bold('Task #' + task.id)}: ${task.title}`,
    '',
    `  ${bold('Status:')}    ${colorStatus(task.status)}`,
    `  ${bold('Priority:')}  ${colorPriority(task.priority)}`,
    `  ${bold('Due Date:')} ${formatDate(task.due_date) || dim('none')}`,
    `  ${bold('Created:')}   ${formatDate(task.created_at)}`,
    `  ${bold('Updated:')}   ${formatDate(task.updated_at)}`,
  ];

  if (task.description) {
    lines.push(`  ${bold('Description:')} ${task.description}`);
  }

  const tagNames = task.tags && task.tags.length
    ? task.tags.map(t => t.name).join(', ')
    : dim('none');
  lines.push(`  ${bold('Tags:')}      ${tagNames}`);

  const projectName = task.project ? task.project.name : dim('none');
  lines.push(`  ${bold('Project:')}   ${projectName}`);

  console.log(lines.join('\n'));
}

function help() {
  console.log([
    bold('tasks show') + ' — show task details',
    '',
    bold('Usage:') + ' tasks show <id>',
  ].join('\n'));
}

module.exports = { run, help };
