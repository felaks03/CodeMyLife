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
    statusActive: 'En curso'
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
    statusActive: 'Running'
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
  }
};
