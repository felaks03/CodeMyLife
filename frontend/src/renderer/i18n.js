const TRANSLATIONS = {
  es: {
    tagline: 'Compromisos que cumples de verdad.',
    name: 'Nombre',
    email: 'Email',
    password: 'Contrasena',
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    noAccount: 'No tienes cuenta?',
    hasAccount: 'Ya tienes cuenta?',
    logout: 'Cerrar sesion',
    newCommitment: 'Nuevo compromiso',
    commitmentName: 'Nombre',
    domains: 'Dominios a bloquear (uno por linea)',
    days: 'Dias',
    from: 'Desde',
    to: 'Hasta',
    start: 'Inicio',
    end: 'Fin',
    create: 'Crear compromiso',
    myCommitments: 'Mis compromisos',
    activity: 'Actividad de los ultimos 28 dias',
    empty: 'Todavia no tienes compromisos.',
    cancel: 'Cancelar',
    blocking: 'Bloqueo activo',
    notBlocking: 'Sin bloqueo activo',
    offline: 'No se pudo conectar con el servidor.',
    pickDay: 'Selecciona al menos un dia.',
    running: 'activos',
    completed: 'cumplidos',
    total: 'en total',
    streak: 'dias de racha',
    dayNames: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
    statusActive: 'En curso',
    guestContinue: 'Entrar con perfil de prueba',
    guestBadge: 'Temporal',
    guestBanner: 'Estas usando un perfil de prueba: tus compromisos y scripts se guardan localmente en este equipo.',
    searchScripts: 'Buscar scripts de la comunidad',
    searchPlaceholder: 'Ej: redes sociales, videojuegos, YouTube...',
    publishScript: 'Publicar un script nuevo',
    scriptName: 'Nombre del script',
    scriptCategory: 'Categoria',
    scriptDescription: 'Descripcion',
    allowCustomDomains: 'Permitir que quien lo use anada sus propios dominios',
    scriptCreated: 'Script publicado. Ya puedes usarlo.',
    noScripts: 'No se encontraron scripts. Prueba otra busqueda o publica el tuyo.',
    by: 'por',
    useScript: 'Usar',
    selectedScript: 'Script seleccionado',
    customDomains: 'Dominios adicionales (opcional, uno por linea)',
    changeScript: 'Elegir otro script',
    fixedDomains: 'Bloquea siempre',
    profileTitle: 'Mi Perfil',
    profileScriptsTitle: 'Scripts activos en tu equipo',
    profileScriptsEmpty: 'No tienes scripts configurados actualmente en tu perfil. Elige uno y crea un compromiso para empezar a aplicarlo a tu equipo.',
    profileActiveCount: 'scripts configurados',
    tabCommitments: 'Bloqueos y Estadisticas',
    tabProfile: 'Mi Perfil'
  },
  en: {
    tagline: 'Commitments you actually keep.',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    logout: 'Sign out',
    newCommitment: 'New commitment',
    commitmentName: 'Name',
    domains: 'Domains to block (one per line)',
    days: 'Days',
    from: 'From',
    to: 'To',
    start: 'Start',
    end: 'End',
    create: 'Create commitment',
    myCommitments: 'My commitments',
    activity: 'Activity over the last 28 days',
    empty: 'You have no commitments yet.',
    cancel: 'Cancel',
    blocking: 'Blocking active',
    notBlocking: 'No active block',
    offline: 'Could not reach the server.',
    pickDay: 'Select at least one day.',
    running: 'active',
    completed: 'completed',
    total: 'total',
    streak: 'day streak',
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    statusActive: 'Running',
    guestContinue: 'Continue with test profile',
    guestBadge: 'Temporary',
    guestBanner: 'You are using a test profile: your commitments and scripts are saved locally on this device.',
    searchScripts: 'Search community scripts',
    searchPlaceholder: 'E.g. social media, gaming, YouTube...',
    publishScript: 'Publish a new script',
    scriptName: 'Script name',
    scriptCategory: 'Category',
    scriptDescription: 'Description',
    allowCustomDomains: 'Let people using it add their own domains',
    scriptCreated: 'Script published. You can use it now.',
    noScripts: 'No scripts found. Try another search or publish your own.',
    by: 'by',
    useScript: 'Use',
    selectedScript: 'Selected script',
    customDomains: 'Extra domains (optional, one per line)',
    changeScript: 'Choose another script',
    fixedDomains: 'Always blocks',
    profileTitle: 'My Profile',
    profileScriptsTitle: 'Scripts active on your machine',
    profileScriptsEmpty: 'You currently have no scripts configured on your profile. Pick one and create a commitment to start applying it to your machine.',
    profileActiveCount: 'configured scripts',
    tabCommitments: 'Blocks & Activity',
    tabProfile: 'My Profile'
  }
};

const i18n = {
  language: localStorage.getItem('language') === 'en' ? 'en' : 'es',

  t(key) {
    return TRANSLATIONS[this.language][key];
  },

  setLanguage(language) {
    this.language = TRANSLATIONS[language] ? language : 'es';
    localStorage.setItem('language', this.language);
    this.apply();
  },

  apply() {
    document.documentElement.lang = this.language;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = this.t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.placeholder = this.t(node.dataset.i18nPlaceholder);
    });
  }
};
