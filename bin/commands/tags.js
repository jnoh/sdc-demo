'use strict';

const { get } = require('../lib/http');
const { bold, table } = require('../lib/output');

async function run(positionals, flags) {
  const tags = await get('/tags');

  if (!tags.length) {
    console.log('No tags found.');
    return;
  }

  const headers = ['ID', 'Name', 'Task Count'];
  const rows = tags.map(t => [
    String(t.id),
    t.name,
    String(t.taskCount),
  ]);

  console.log(table(headers, rows));
}

function help() {
  console.log([
    bold('tasks tags') + ' — list all tags with task counts',
    '',
    bold('Usage:') + ' tasks tags',
  ].join('\n'));
}

module.exports = { run, help };
