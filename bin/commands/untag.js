'use strict';

const { del } = require('../lib/http');
const { bold, green } = require('../lib/output');

async function run(positionals, flags) {
  const id = positionals[0];
  const tagName = positionals[1];

  if (!id || !tagName) {
    throw new Error('Usage: tasks untag <id> <tagName>');
  }

  await del(`/tasks/${id}/tags/${encodeURIComponent(tagName)}`);
  console.log(green(`Removed tag '${tagName}' from task #${id}`));
}

function help() {
  console.log([
    bold('tasks untag') + ' — remove a tag from a task',
    '',
    bold('Usage:') + ' tasks untag <id> <tagName>',
    '',
    bold('Arguments:'),
    '  id        Task ID',
    '  tagName   Name of the tag to remove',
  ].join('\n'));
}

module.exports = { run, help };
