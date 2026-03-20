'use strict';

const { post } = require('../lib/http');
const { bold, green } = require('../lib/output');

async function run(positionals, flags) {
  const id = positionals[0];
  const tagName = positionals[1];

  if (!id || !tagName) {
    throw new Error('Usage: tasks tag <id> <tagName>');
  }

  await post(`/tasks/${id}/tags`, { name: tagName });
  console.log(green(`Tagged task #${id} with '${tagName}'`));
}

function help() {
  console.log([
    bold('tasks tag') + ' — add a tag to a task',
    '',
    bold('Usage:') + ' tasks tag <id> <tagName>',
    '',
    bold('Arguments:'),
    '  id        Task ID',
    '  tagName   Name of the tag to add',
  ].join('\n'));
}

module.exports = { run, help };
