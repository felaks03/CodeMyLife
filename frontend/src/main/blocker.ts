import { constants as fsConstants, promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { renderHostsFile, sanitizeDomains } from '../shared/hosts-file';

const execFileAsync = promisify(execFile);

function hostsPath(): string {
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
  return path.join(systemRoot, 'System32', 'drivers', 'etc', 'hosts');
}

async function flushDns(): Promise<void> {
  try {
    await execFileAsync('ipconfig', ['/flushdns']);
  } catch {
    // Flushing is best-effort; the hosts entries still take effect for new lookups.
  }
}

export class HostsBlocker {
  private appliedDomains: string[] = [];

  forceReconcile(): void {
    this.appliedDomains = [];
  }

  async apply(domains: string[]): Promise<void> {
    const sanitized = sanitizeDomains(domains);
    if (this.isSameAsApplied(sanitized)) {
      return;
    }

    const file = hostsPath();
    let original: string;
    try {
      original = await fs.readFile(file, 'utf8');
      await fs.writeFile(file, renderHostsFile(original, sanitized), 'utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES') {
        throw new Error('CodeMyLife necesita permisos de administrador para modificar el bloqueo de Windows. Ejecuta run.cmd y acepta la ventana UAC.');
      }
      throw error;
    }

    this.appliedDomains = sanitized;
    await flushDns();
  }

  async clear(): Promise<void> {
    await this.apply([]);
  }

  async canWrite(): Promise<boolean> {
    try {
      await fs.access(hostsPath(), fsConstants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private isSameAsApplied(domains: string[]): boolean {
    return (
      domains.length === this.appliedDomains.length &&
      domains.every((domain, index) => domain === this.appliedDomains[index])
    );
  }
}
