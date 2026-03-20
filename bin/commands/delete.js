'use strict';

const { del } = require('../lib/http');
const { bold } = require('../lib/output');

function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    if (!process.stdin.isTTY) {
      resolve('');
      return;
    }
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      resolve(data.trim().toLowerCase());
    });
  });
}

async function run(positionals, flags) {
  const id = positionals[0];
  if (!id) {
    throw new Error('Task ID is required. Usage: tasks delete <id>');
  }

  const answer = await prompt(`Delete task #${id}? (y/N) `);
  if (answer !== 'y') {
    console.log('Cancelled');
    return;
  }

  await del(`/tasks/${id}`);
  console.log(`Deleted task #${id}`);
}

function help() {
  console.log([
    bold('tasks delete') + ' — delete a task',
    '',
    bold('Usage:') + ' tasks delete <id>',
  ].join('\n'));
}

module.exports = { run, help };
