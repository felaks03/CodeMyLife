import { Script } from './types';

// Catalogo minimo para el modo invitado, sin conexion a un backend.
export const BUILTIN_SCRIPTS: Script[] = [
  {
    _id: 'builtin-youtube',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de YouTube',
    description: 'Bloquea YouTube y sus enlaces cortos durante el horario que elijas.',
    category: 'Video',
    blockedDomains: ['youtube.com', 'youtu.be'],
    allowCustomDomains: true,
    usageCount: 0
  },
  {
    _id: 'builtin-social',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de redes sociales',
    description: 'Bloquea Instagram, TikTok y X durante el horario que elijas.',
    category: 'Redes sociales',
    blockedDomains: ['instagram.com', 'tiktok.com', 'x.com', 'twitter.com'],
    allowCustomDomains: true,
    usageCount: 0
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
