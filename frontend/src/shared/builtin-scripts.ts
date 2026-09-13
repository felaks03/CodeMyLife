import { Script } from './types';

// Catalogo minimo para el modo invitado, sin conexion a un backend.
export const INSTAGRAM_DOMAINS = [
  'instagram.com',
  'i.instagram.com',
  'm.instagram.com',
  'graph.instagram.com',
  'api.instagram.com',
  'cdninstagram.com',
  'instagram.net'
];

export const BUILTIN_SCRIPTS: Script[] = [
  {
    _id: 'builtin-youtube',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de YouTube',
    description: 'Bloquea YouTube y sus enlaces cortos de lunes a viernes, de 15:00 a 17:00.',
    category: 'Video',
    blockedDomains: ['youtube.com', 'youtu.be'],
    allowCustomDomains: true,
    usageCount: 0,
    schedule: {
      days: [1, 2, 3, 4, 5],
      startTime: '15:00',
      endTime: '17:00'
    }
  },
  {
    _id: 'builtin-instagram',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de Instagram',
    description: 'Bloquea Instagram salvo cuando activas manualmente sus 15 minutos diarios.',
    category: 'Redes sociales',
    blockedDomains: INSTAGRAM_DOMAINS,
    allowCustomDomains: true,
    usageCount: 0,
    blockingMode: 'daily-limit',
    dailyLimitMinutes: 15
  },
  {
    _id: 'builtin-social-rest',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de redes',
    description: 'Bloquea permanentemente TikTok, X y Twitter.',
    category: 'Redes sociales',
    blockedDomains: ['tiktok.com', 'x.com', 'twitter.com'],
    allowCustomDomains: true,
    usageCount: 0,
    blockingMode: 'always'
  }
];

export function searchBuiltinScripts(query: string): Script[] {
  const q = query.trim().toLowerCase();
  if (!q) return BUILTIN_SCRIPTS;
  return BUILTIN_SCRIPTS.filter(
    (script) =>
      script.name.toLowerCase().includes(q) ||
      script.description.toLowerCase().includes(q) ||
      script.category.toLowerCase().includes(q)
  );
}
