import test from 'node:test';
import assert from 'node:assert/strict';
import { isYoutubeShortsUrl } from '../src/shared/youtube-shorts';

test('bloquea rutas reales de YouTube Shorts', () => {
  assert.equal(isYoutubeShortsUrl('https://youtube.com/shorts'), true);
  assert.equal(isYoutubeShortsUrl('https://www.youtube.com/shorts/abc123'), true);
  assert.equal(isYoutubeShortsUrl('https://m.youtube.com/shorts/abc123?feature=share'), true);
});

test('permite YouTube normal', () => {
  assert.equal(isYoutubeShortsUrl('https://www.youtube.com/watch?v=abc123'), false);
  assert.equal(isYoutubeShortsUrl('https://youtube.com/results?search_query=focus'), false);
  assert.equal(isYoutubeShortsUrl('https://www.youtube.com/@channel'), false);
  assert.equal(isYoutubeShortsUrl('https://youtu.be/abc123'), false);
});

test('no confunde dominios falsos con YouTube', () => {
  assert.equal(isYoutubeShortsUrl('https://youtube.com.evil.test/shorts/abc123'), false);
  assert.equal(isYoutubeShortsUrl('not-a-url'), false);
});