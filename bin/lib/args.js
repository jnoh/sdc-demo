'use strict';

/**
 * Minimal arg parser. Extracts positional args and --flag=value / --boolean flags.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ positionals: string[], flags: Record<string, string|boolean> }}
 */
function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const withoutDashes = arg.slice(2);
      const eqIndex = withoutDashes.indexOf('=');
      if (eqIndex !== -1) {
        const key = withoutDashes.slice(0, eqIndex);
        const value = withoutDashes.slice(eqIndex + 1);
        flags[key] = value;
      } else {
        flags[withoutDashes] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags };
}

module.exports = { parseArgs };
