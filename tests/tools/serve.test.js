import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { resolveRequestPath, startServer } from '../../tools/serve.js';

const ROOT = join(tmpdir(), 'gero-root');

test('maps / to index.html', () => {
  assert.equal(resolveRequestPath(ROOT, '/'), join(ROOT, 'index.html'));
});

test('ignores the query string', () => {
  assert.equal(resolveRequestPath(ROOT, '/js/app.js?v=1'), join(ROOT, 'js', 'app.js'));
});

test('keeps traversal attempts inside the root', () => {
  for (const url of ['/../secret.txt', '/%2e%2e/%2e%2e/secret.txt', '/js/../../secret.txt']) {
    const resolved = resolveRequestPath(ROOT, url);
    assert.ok(resolved === null || resolved.startsWith(ROOT + sep), `${url} -> ${resolved}`);
  }
});

test('rejects malformed escapes', () => {
  assert.equal(resolveRequestPath(ROOT, '/%E0%A4%A'), null);
});

test('serves files and answers 404 for missing ones', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gero-serve-'));
  await writeFile(join(root, 'index.html'), '<h1>ok</h1>');
  const server = await startServer({ root, port: 0 });
  try {
    const { port } = server.address();
    const ok = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('content-type'), /text\/html/);
    assert.equal(await ok.text(), '<h1>ok</h1>');
    const missing = await fetch(`http://127.0.0.1:${port}/nope.js`);
    assert.equal(missing.status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('returns 400 for malformed URLs over HTTP', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gero-serve-'));
  await writeFile(join(root, 'index.html'), '<h1>ok</h1>');
  const server = await startServer({ root, port: 0 });
  try {
    const { port } = server.address();
    const bad = await fetch(`http://127.0.0.1:${port}/%E0%A4%A`);
    assert.equal(bad.status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
