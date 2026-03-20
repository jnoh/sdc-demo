'use strict';

const { patch } = require('../lib/http');
const { bold } = require('../lib/output');

async function run(positionals, flags) {
  const id = positionals[0];
  if (!id) {
    throw new Error('Task ID is required. Usage: tasks done <id>');
  }

  await patch(`/tasks/${id}`, { status: 'done' });
  console.log(`Task #${id} marked as done`);
}

function help() {
  console.log([
    bold('tasks done') + ' — mark a task as done',
    '',
    bold('Usage:') + ' tasks done <id>',
  ].join('\n'));
}

module.exports = { run, help };
