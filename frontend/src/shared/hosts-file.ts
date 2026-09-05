export const BEGIN_MARKER = '# === CodeMyLife BEGIN (no editar a mano) ===';
export const END_MARKER = '# === CodeMyLife END ===';

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;

export function sanitizeDomains(domains: string[]): string[] {
  return [...new Set(domains.map((domain) => domain.trim().toLowerCase()))]
    .filter((domain) => DOMAIN_PATTERN.test(domain))
    .sort();
}

export function buildManagedBlock(domains: string[]): string {
  const entries = domains.flatMap((domain) => [
    `127.0.0.1 ${domain}`,
    `127.0.0.1 www.${domain}`,
    `::1 ${domain}`,
    `::1 www.${domain}`
  ]);
  return [BEGIN_MARKER, ...entries, END_MARKER].join('\r\n');
}

export function stripManagedBlock(contents: string): string {
  const begin = contents.indexOf(BEGIN_MARKER);
  const end = contents.indexOf(END_MARKER);
  if (begin === -1 || end === -1 || end < begin) {
    return contents;
  }
  const before = contents.slice(0, begin).replace(/\s+$/, '');
  const after = contents.slice(end + END_MARKER.length).replace(/^\s+/, '');
  return after ? `${before}\r\n${after}` : `${before}\r\n`;
}

export function renderHostsFile(currentContents: string, domains: string[]): string {
  const cleaned = stripManagedBlock(currentContents).replace(/\s+$/, '');
  if (domains.length === 0) {
    return `${cleaned}\r\n`;
  }
  return `${cleaned}\r\n\r\n${buildManagedBlock(domains)}\r\n`;
}
