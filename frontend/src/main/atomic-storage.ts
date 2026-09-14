import { promises as fs } from 'fs';
import * as path from 'path';

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(value), 'utf8');
  await fs.rename(temporaryPath, filePath);
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
