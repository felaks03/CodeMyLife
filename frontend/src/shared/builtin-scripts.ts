import { Script } from './types';

export const LUST_BLOCKED_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'spankbang.com',
  'chaturbate.com',
  'onlyfans.com',
  'deviantart.com',
  'flowgpt.com',
  'tiava.com',
  'brazzers.com',
  'bangbros.com',
  'brazzer.com',
  'realitykings.com',
  'mofos.com',
  'mylf.com',
  'teamskeet.com',
  'fakehub.com',
  'naughtyamerica.com',
  'digitalplayground.com',
  'wicked.com',
  'evilangel.com',
  'bang.com',
  'private.com',
  'penthouse.com',
  'playboy.com',
  'hustler.com',
  'jerkmate.com',
  'livejasmin.com',
  'stripchat.com',
  'camsoda.com',
  'myfreecams.com',
  'bongacams.com',
  'cam4.com',
  'flirt4free.com',
  'imlive.com',
  'streamate.com',
  'livecam.com',
  'camwhores.tv',
  'porn.com',
  'pornhd.com',
  'pornone.com',
  'porn300.com',
  'pornbest.com',
  'pornpics.com',
  'pornmd.com',
  'pornrabbit.com',
  'pornhat.com',
  'pornbox.com',
  'porncoil.com',
  'porndig.com',
  'pornmd.net',
  'beeg.com',
  'empflix.com',
  'extremetube.com',
  'fux.com',
  'fuq.com',
  'gotporn.com',
  'hclips.com',
  'hqporner.com',
  'keezmovies.com',
  'nuvid.com',
  'pornerbros.com',
  'pornheed.com',
  'pornhost.com',
  'pornktube.com',
  'pornrabbit.com',
  'pornsocket.com',
  'pornstarbyface.com',
  'pornwow.com',
  'redgifs.com',
  'rule34.xxx',
  'sex.com',
  'sexstories.com',
  'slutload.com',
  'tnaflix.com',
  'tubegalore.com',
  'tubous.com',
  'vidz.com',
  'voyeurhit.com',
  'xhamsterlive.com',
  'xhamster.desi',
  'xmoviesforyou.com',
  'xxx.com',
  'xxxstreams.org',
  'xart.com',
  'xanimu.com',
  'xxxbunker.com',
  'xxxvideos.es',
  'xxxvideo.blog',
  'youjizz.com',
  'yuvutu.com',
  'zbporn.com',
  '4tube.com',
  '91porn.com',
  'daftsex.com',
  'fuqer.com',
  'heavy-r.com',
  'hentai-foundry.com',
  'hentaihaven.xxx',
  'hanime.tv',
  'nhentai.net',
  'e-hentai.org',
  'eporner.com',
  'faphouse.com',
  'manyvids.com',
  'modelhub.com',
  'clips4sale.com',
  'loyalfans.com',
  'fansly.com',
  'justfor.fans',
  'fansoda.com',
  'fanvue.com',
  'pornpen.ai',
  'sexstories.xxx',
  'literotica.com',
  'nifty.org',
  'storiesonline.net'
];

export const VIDEO_GAME_BLOCKED_PROCESSES = [
  'steam.exe',
  'steamwebhelper.exe',
  'MinecraftLauncher.exe',
  'Minecraft.exe'
];

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

export const YOUTUBE_DOMAINS = ['youtube.com', 'youtu.be'];

export const BUILTIN_SCRIPTS: Script[] = [
  {
    _id: 'builtin-youtube',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de YouTube',
    description: 'Bloquea YouTube completo todos los dias salvo cuando activas manualmente sus 30 minutos diarios.',
    category: 'Video',
    blockedDomains: YOUTUBE_DOMAINS,
    allowCustomDomains: true,
    usageCount: 0,
    schedule: {
      days: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '24:00'
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
  },
  {
    _id: 'builtin-sleep',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de dormir',
    description: 'Bloquea la pantalla de lunes a jueves de 00:00 a 08:00 para ayudarte a dormir.',
    category: 'Descanso',
    blockedDomains: [],
    allowCustomDomains: false,
    usageCount: 0,
    showLockScreen: true,
    schedule: {
      days: [1, 2, 3, 4],
      startTime: '00:00',
      endTime: '08:00'
    }
  },
  {
    _id: 'builtin-lust',
    authorName: 'CodeMyLife',
    name: 'Bloqueo Lust',
    description: 'Bloquea permanentemente paginas para adultos, DeviantArt y FlowGPT.',
    category: 'Permanente',
    blockedDomains: LUST_BLOCKED_DOMAINS,
    allowCustomDomains: false,
    usageCount: 0,
    blockingMode: 'always'
  },
  {
    _id: 'builtin-games',
    authorName: 'CodeMyLife',
    name: 'Bloqueo de videojuegos',
    description: 'Bloquea Steam y Minecraft Launcher de forma permanente, salvo viernes desde las 17:00 hasta el final del dia y todo el fin de semana.',
    category: 'Videojuegos',
    blockedDomains: [],
    allowCustomDomains: false,
    usageCount: 0,
    blockingMode: 'always',
    unlockable: true,
    blockedProcesses: VIDEO_GAME_BLOCKED_PROCESSES
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
