import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YOUTUBE_SHORTS_POLICY_KEYS,
  YOUTUBE_SHORTS_POLICY_PATTERNS,
  youtubeShortsPolicyAddArgs,
  youtubeShortsPolicyDeleteArgs
} from '../src/main/browser-policy';

test('la politica de navegador bloquea solo rutas de YouTube Shorts', () => {
  assert.deepEqual(YOUTUBE_SHORTS_POLICY_PATTERNS, [
    '*://youtube.com/shorts*',
    '*://www.youtube.com/shorts*',
    '*://m.youtube.com/shorts*'
  ]);
  assert.equal(YOUTUBE_SHORTS_POLICY_PATTERNS.some((pattern) => pattern === '*://youtube.com/*'), false);
});

test('la politica se registra en Chrome y Edge con valores reservados de CodeMyLife', () => {
  assert.deepEqual(YOUTUBE_SHORTS_POLICY_KEYS, [
    'HKLM\\Software\\Policies\\Google\\Chrome\\URLBlocklist',
    'HKLM\\Software\\Policies\\Microsoft\\Edge\\URLBlocklist',
    'HKCU\\Software\\Policies\\Google\\Chrome\\URLBlocklist',
    'HKCU\\Software\\Policies\\Microsoft\\Edge\\URLBlocklist'
  ]);
  assert.deepEqual(
    youtubeShortsPolicyAddArgs(YOUTUBE_SHORTS_POLICY_KEYS[0], 1, YOUTUBE_SHORTS_POLICY_PATTERNS[0]),
    ['ADD', YOUTUBE_SHORTS_POLICY_KEYS[0], '/v', '9001', '/t', 'REG_SZ', '/d', '*://youtube.com/shorts*', '/f']
  );
  assert.deepEqual(
    youtubeShortsPolicyDeleteArgs(YOUTUBE_SHORTS_POLICY_KEYS[1], 3),
    ['DELETE', YOUTUBE_SHORTS_POLICY_KEYS[1], '/v', '9003', '/f']
  );
});