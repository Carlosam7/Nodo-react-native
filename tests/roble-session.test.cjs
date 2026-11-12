const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return resolve.call(this, request, parent, ...rest);
};
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'react-native') return { Platform: { OS: 'web' } };
  if (request === 'expo-secure-store') return {};
  return load.call(this, request, ...rest);
};
Module._extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  module._compile(result.outputText, filename);
};
const { RobleClient } = require('../src/core/db/roble-client.ts');
const response = (status, value) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

function mockBackend(options = {}) {
  const counts = { refresh: 0, reads: 0 };
  const originalFetch = global.fetch;
  global.fetch = async (url, init) => {
    if (url.endsWith('/login')) return response(200, { accessToken: 'old', refreshToken: 'refresh' });
    if (url.endsWith('/me')) return response(200, { id: 'user', email: 'user@example.test' });
    if (url.endsWith('/refresh-token')) {
      counts.refresh++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response(options.refreshStatus || 200, options.refreshStatus ? { message: 'expired' } : { accessToken: 'new', refreshToken: 'refresh2' });
    }
    counts.reads++;
    if (init.headers.Authorization === 'Bearer old' || options.rejectRetry) return response(401, { message: 'unauthorized' });
    if (options.forbidden) return response(403, { message: 'forbidden' });
    return response(200, [{ id: 'ok' }]);
  };
  return { counts, restore: () => { global.fetch = originalFetch; } };
}

test('las solicitudes concurrentes comparten una renovación y reintentan', async () => {
  const mock = mockBackend();
  try {
    const client = new RobleClient('https://example.test', 'test');
    await client.login('user@example.test', 'test');
    const results = await Promise.all([client.read('projects'), client.read('applications'), client.read('project_skills')]);
    assert.equal(mock.counts.refresh, 1);
    assert.equal(mock.counts.reads, 6);
    assert.equal(results.length, 3);
  } finally { mock.restore(); }
});

test('un segundo 401 termina el reintento y notifica la expiración', async () => {
  const mock = mockBackend({ rejectRetry: true });
  try {
    const client = new RobleClient('https://example.test', 'test');
    await client.login('user@example.test', 'test');
    let notifications = 0;
    client.subscribeSessionExpired(() => notifications++);
    await assert.rejects(client.read('projects'));
    assert.equal(mock.counts.refresh, 1);
    assert.equal(mock.counts.reads, 2);
    assert.equal(notifications, 1);
    assert.equal(client.isLoggedIn, false);
  } finally { mock.restore(); }
});

test('un 403 tras renovar no cierra la sesión', async () => {
  const mock = mockBackend({ forbidden: true });
  try {
    const client = new RobleClient('https://example.test', 'test');
    await client.login('user@example.test', 'test');
    await assert.rejects(client.read('projects'), { statusCode: 403 });
    assert.equal(client.isLoggedIn, true);
    assert.equal(mock.counts.refresh, 1);
  } finally { mock.restore(); }
});

test('una renovación rechazada cierra la sesión una sola vez', async () => {
  const mock = mockBackend({ refreshStatus: 401 });
  try {
    const client = new RobleClient('https://example.test', 'test');
    await client.login('user@example.test', 'test');
    let notifications = 0;
    client.subscribeSessionExpired(() => notifications++);
    const result = await Promise.allSettled([client.read('projects'), client.read('applications')]);
    assert.ok(result.every((item) => item.status === 'rejected'));
    assert.equal(mock.counts.refresh, 1);
    assert.equal(notifications, 1);
    assert.equal(client.isLoggedIn, false);
  } finally { mock.restore(); }
});

test('un error del servidor al renovar no elimina la sesión', async () => {
  const mock = mockBackend({ refreshStatus: 503 });
  try {
    const client = new RobleClient('https://example.test', 'test');
    await client.login('user@example.test', 'test');
    await assert.rejects(client.read('projects'), { statusCode: 503 });
    assert.equal(client.isLoggedIn, true);
  } finally { mock.restore(); }
});
