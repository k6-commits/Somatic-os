import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../../app/', import.meta.url).pathname;
const skip = new Set(['sw.js', 'js/vendor/LICENSES.md']);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [relative(root, p)];
  });
}

test('the service worker caches every app file', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const listed = new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean));
  const actual = files(root).filter((f) => !skip.has(f));
  assert.deepEqual(actual.filter((f) => !listed.has(f)), [], 'files missing from the cache list');
  assert.deepEqual([...listed].filter((f) => !actual.includes(f)), [], 'listed files that do not exist');
});
