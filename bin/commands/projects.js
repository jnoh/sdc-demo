'use strict';

const { get, post } = require('../lib/http');
const { bold, dim, green, table, formatDate } = require('../lib/output');

async function run(positionals, flags) {
  const subcommand = positionals[0];

  if (!subcommand) {
    return listProjects();
  }

  if (subcommand === 'add') {
    return addProject(positionals.slice(1), flags);
  }

  if (subcommand === 'show') {
    return showProject(positionals.slice(1));
  }

  throw new Error(`Unknown subcommand: ${subcommand}. Run 'tasks projects --help' for usage.`);
}

async function listProjects() {
  const projects = await get('/projects');

  if (!projects.length) {
    console.log('No projects found.');
    return;
  }

  const headers = ['ID', 'Name', 'Description'];
  const rows = projects.map(p => [
    String(p.id),
    p.name,
    p.description || '',
  ]);

  console.log(table(headers, rows));
}

async function addProject(positionals, flags) {
  const name = positionals[0];

  if (!name) {
    throw new Error('Usage: tasks projects add <name> [--description=<desc>]');
  }

  const body = { name };
  if (flags.description) {
    body.description = flags.description;
  }

  const project = await post('/projects', body);
  console.log(green(`Created project #${project.id}: ${project.name}`));
}

async function showProject(positionals) {
  const id = positionals[0];

  if (!id) {
    throw new Error('Usage: tasks projects show <id>');
  }

  const [project, tasks] = await Promise.all([
    get(`/projects/${id}`),
    get(`/projects/${id}/tasks`),
  ]);

  console.log(bold('Project #' + project.id) + ': ' + project.name);
  if (project.description) {
    console.log(dim(project.description));
  }
  if (project.created_at) {
    console.log(dim('Created: ' + formatDate(project.created_at)));
  }
  console.log('');

  if (!tasks.length) {
    console.log('No tasks in this project.');
    return;
  }

  const headers = ['ID', 'Title', 'Status'];
  const rows = tasks.map(t => [
    String(t.id),
    t.title,
    t.status,
  ]);

  console.log(table(headers, rows));
}

function help() {
  console.log([
    bold('tasks projects') + ' — manage projects',
    '',
    bold('Usage:'),
    '  tasks projects                          List all projects',
    '  tasks projects add <name> [--description=<desc>]  Create a project',
    '  tasks projects show <id>                Show project details and tasks',
  ].join('\n'));
}

module.exports = { run, help };
