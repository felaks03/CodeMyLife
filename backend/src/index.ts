import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

async function start(): Promise<void> {
  try {
    await connectDatabase();
    createApp().listen(env.port, () => {
      console.log(`CodeMyLife API listening on port ${env.port}`);
    });
  } catch (error) {
    console.log('Aviso: MongoDB no está disponible. Modo local activado.');
    process.exit(0);
  }
}
