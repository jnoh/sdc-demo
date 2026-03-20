'use strict';

const BASE_URL = process.env.TASKS_API || 'http://localhost:3000';

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    if (err.cause && err.cause.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to API at ${BASE_URL}`);
    }
    if (err.message && err.message.includes('fetch failed')) {
      throw new Error(`Cannot connect to API at ${BASE_URL}`);
    }
    throw err;
  }

  if (res.status === 204) {
    return null;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

function get(path) {
  return request('GET', path);
}

function post(path, body) {
  return request('POST', path, body);
}

function patch(path, body) {
  return request('PATCH', path, body);
}

function del(path) {
  return request('DELETE', path);
}

module.exports = { get, post, patch, del, BASE_URL };
