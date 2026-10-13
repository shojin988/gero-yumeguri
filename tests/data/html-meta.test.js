import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const PUBLIC_URL = 'https://shojin988.github.io/gero-yumeguri/';

function meta(attribute, name) {
  const match = new RegExp(`<meta ${attribute}="${name}" content="([^"]+)"`).exec(html);
  return match?.[1] ?? null;
}

test('has a share preview for social networks and chat apps', () => {
  assert.equal(meta('property', 'og:type'), 'website');
  assert.equal(meta('property', 'og:url'), PUBLIC_URL);
  assert.match(meta('property', 'og:title'), /湯めぐり手形/);
  assert.ok(meta('property', 'og:description').length > 20);
  assert.equal(meta('property', 'og:image'), `${PUBLIC_URL}icons/icon-512.png`);
  assert.equal(meta('name', 'twitter:card'), 'summary');
});
