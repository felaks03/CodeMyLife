import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

async function start(): Promise<void> {
  await connectDatabase();
  createApp().listen(env.port, () => {
    console.log(`CodeMyLife API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
