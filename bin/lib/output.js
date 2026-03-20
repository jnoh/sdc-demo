'use strict';

const noColor = 'NO_COLOR' in process.env;

function wrap(code, text) {
  if (noColor) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

function green(text) { return wrap('32', text); }
function yellow(text) { return wrap('33', text); }
function red(text) { return wrap('31', text); }
function bold(text) { return wrap('1', text); }
function dim(text) { return wrap('2', text); }

/**
 * Format a table with unicode box-drawing characters.
 * @param {string[]} headers
 * @param {string[][]} rows
 * @returns {string}
 */
function table(headers, rows) {
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const cellWidths = rows.map(r => String(r[i] || '').length);
    return Math.max(h.length, ...cellWidths);
  });

  const top    = '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const mid    = '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const bottom = '└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

  function formatRow(cells) {
    const padded = cells.map((c, i) => {
      const s = String(c || '');
      return ' ' + s + ' '.repeat(widths[i] - s.length + 1);
    });
    return '│' + padded.join('│') + '│';
  }

  const lines = [top, formatRow(headers), mid];
  for (const row of rows) {
    lines.push(formatRow(row));
  }
  lines.push(bottom);

  return lines.join('\n');
}

/**
 * Format an ISO date string to a readable short form.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

module.exports = { green, yellow, red, bold, dim, table, formatDate };
