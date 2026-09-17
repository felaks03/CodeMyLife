import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const pendingWrites = new Map<string, Promise<void>>();

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const previous = pendingWrites.get(filePath) ?? Promise.resolve();
  const write = previous.then(() => writeAtomic(filePath, value));
  pendingWrites.set(filePath, write);
  try {
    await write;
  } finally {
    if (pendingWrites.get(filePath) === write) pendingWrites.delete(filePath);
  }
}

async function writeAtomic(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(value), 'utf8');
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.unlink(temporaryPath).catch(() => undefined);
  }
}

export async function removeTemporaryJson(filePath: string): Promise<void> {
  try {
    await fs.unlink(`${filePath}.${process.pid}.tmp`);
  } catch {
    // The temporary file may not exist.
  }
}

export function siblingTemporaryPath(filePath: string): string {
  return path.join(path.dirname(filePath), `${path.basename(filePath)}.${process.pid}.tmp`);
}
