import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { YOUTUBE_SHORTS_BROWSER_PROCESSES, YOUTUBE_SHORTS_WINDOW_TITLE_PATTERN, youtubeShortsWindowGuardCommand } from '../src/main/youtube-shorts-window-guard';

const execFileAsync = promisify(execFile);

test('el guard de ventanas vigila navegadores comunes', () => {
  assert.deepEqual(YOUTUBE_SHORTS_BROWSER_PROCESSES, ['chrome', 'msedge', 'brave', 'firefox', 'opera']);
});

test('el guard de ventanas cierra solo titulos de YouTube Shorts', () => {
  const command = youtubeShortsWindowGuardCommand(['chrome']);
  assert.match(command, /Get-Process -ErrorAction SilentlyContinue/);
  assert.match(command, /@\('chrome'\) -contains \$_\.ProcessName/);
  assert.match(command, /MainWindowTitle/);
  assert.match(command, /shorts/);
  assert.match(command, /youtube/);
  assert.match(command, /Stop-Process -Force/);
});

test('el patron de titulo detecta Shorts sin coincidir con YouTube normal', () => {
  const pattern = new RegExp(YOUTUBE_SHORTS_WINDOW_TITLE_PATTERN.replace('(?i)', ''), 'i');
  assert.equal(pattern.test('Shorts - YouTube - Google Chrome'), true);
  assert.equal(pattern.test('YouTube Shorts - Microsoft Edge'), true);
  assert.equal(pattern.test('Video normal - YouTube - Google Chrome'), false);
});

test('el comando del guard se ejecuta aunque no haya navegadores coincidentes', async (context) => {
  if (process.platform !== 'win32') context.skip('solo aplica a Windows');

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    youtubeShortsWindowGuardCommand(['definitely-not-a-browser-process'])
  ]);
});