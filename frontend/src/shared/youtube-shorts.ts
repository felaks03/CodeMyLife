const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export function isYoutubeShortsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) && /^\/shorts(?:\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}