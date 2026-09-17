import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { writeJsonAtomic } from '../src/main/atomic-storage';

test('escrituras atomicas simultaneas conservan un JSON valido', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codemylife-atomic-'));
  const file = path.join(directory, 'daily-focus.json');
  try {
    await Promise.all(
      Array.from({ length: 8 }, (_, index) => writeJsonAtomic(file, { index, startedAt: new Date().toISOString() }))
    );

    const saved = JSON.parse(await fs.readFile(file, 'utf8')) as { index: number };
    assert.ok(saved.index >= 0 && saved.index < 8);
    const files = await fs.readdir(directory);
    assert.equal(files.some((name) => name.endsWith('.tmp')), false);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});