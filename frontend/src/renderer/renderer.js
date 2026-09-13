const el = (id) => document.getElementById(id);
let isRegisterMode = false;
let lastOverview = null;
let lastBlockingState = null;
let selectedScript = null;
let searchDebounce = null;

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function renderDayCheckboxes() {
  const container = el('days');
  const selected = new Set(
    [...container.querySelectorAll('input:checked')].map((input) => input.value)
  );
  const isFirstRender = container.childElementCount === 0;

  container.replaceChildren();

  i18n.t('dayNames').forEach((label, index) => {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = String(index);
    input.checked = isFirstRender ? index >= 1 && index <= 5 : selected.has(String(index));

    const text = document.createElement('span');
    text.textContent = label;

    wrapper.append(input, text);
    container.append(wrapper);
  });
}

function setAuthMode(register) {
  isRegisterMode = register;
  el('name-field').classList.toggle('hidden', !register);
  el('name').required = register;
  el('auth-submit').textContent = i18n.t(register ? 'signUp' : 'signIn');
  el('switch-text').textContent = i18n.t(register ? 'hasAccount' : 'noAccount');
  el('switch-mode').textContent = i18n.t(register ? 'signIn' : 'signUp');
  el('auth-error').textContent = '';
}

function showApp(user) {
  el('auth-view').classList.add('hidden');
  el('app-view').classList.remove('hidden');
  el('user-name').textContent = user.id === 'guest' ? `${user.name} (${i18n.t('guestBadge')})` : user.name;
  el('guest-banner').classList.toggle('hidden', user.id !== 'guest');

  // Actualizar datos de perfil
  el('profile-name').textContent = user.id === 'guest' ? `${user.name} (${i18n.t('guestBadge')})` : user.name;
  el('profile-email').textContent = user.email || (user.id === 'guest' ? 'Almacenamiento local' : '');
  el('profile-avatar').textContent = (user.name || 'P').charAt(0).toUpperCase();

  switchTab('dashboard');
  void refreshOverview();
  void refreshBlockingState();
  void searchScripts('');
}

function showAuth() {
  el('app-view').classList.add('hidden');
  el('auth-view').classList.remove('hidden');
  el('banner').classList.add('hidden');
}

function renderBlockingState(state) {
  lastBlockingState = state;
  const status = el('blocking-status');
  status.classList.toggle('on', state.enforcing);
  status.textContent = state.enforcing
    ? `${i18n.t('blocking')}: ${state.blockedDomains.join(', ')}`
    : i18n.t('notBlocking');

  const banner = el('banner');
  if (state.lastError) {
    banner.textContent = state.lastError;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

async function refreshBlockingState() {
  try {
    renderBlockingState(await window.codeMyLife.getBlockingState());
  } catch {
    // The scheduler pushes updates as soon as it has a state.
  }
}

function renderCalendar(calendar) {
  const container = el('calendar');
  container.replaceChildren();

  calendar.forEach((day) => {
    const cell = document.createElement('span');
    cell.className = day.scheduled ? 'day on' : 'day';
    cell.title = day.date;
    container.append(cell);
  });
}

function isRunning(commitment) {
  const now = Date.now();
  return (
    commitment.status === 'active' &&
    new Date(commitment.startsAt).getTime() <= now &&
    new Date(commitment.endsAt).getTime() >= now
  );
}

function renderCommitments(commitments) {
  const list = el('commitments');
  list.replaceChildren();

  if (commitments.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = i18n.t('empty');
    list.append(empty);
    return;
  }

  const dayNames = i18n.t('dayNames');

  commitments.forEach((commitment) => {
    const item = document.createElement('li');

    const header = document.createElement('div');
    header.className = 'item-header';

    const title = document.createElement('strong');
    title.textContent = commitment.name;
    header.append(title);

    if (isRunning(commitment)) {
      const tag = document.createElement('span');
      tag.className = 'tag active';
      tag.textContent = i18n.t('statusActive');
      header.append(tag);
    } else if (commitment.status === 'active') {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'ghost small';
      cancel.textContent = i18n.t('cancel');
      cancel.addEventListener('click', () => void cancelCommitment(commitment._id));
      header.append(cancel);
    }

    const schedule = document.createElement('div');
    schedule.className = 'meta';
    schedule.textContent = `${commitment.days.map((day) => dayNames[day]).join(', ')} · ${commitment.startTime}-${commitment.endTime}`;

    const period = document.createElement('div');
    period.className = 'meta';
    period.textContent = `${commitment.startsAt.slice(0, 10)} → ${commitment.endsAt.slice(0, 10)} · ${commitment.blockedDomains.join(', ')}`;

    item.append(header, schedule, period);
    list.append(item);
  });
}

function renderOverview(overview) {
  lastOverview = overview;
  const { stats } = overview;
  el('stats').textContent = `${stats.running} ${i18n.t('running')} · ${stats.completed} ${i18n.t('completed')} · ${stats.total} ${i18n.t('total')} · ${stats.streak} ${i18n.t('streak')}`;
  renderCalendar(overview.calendar);
  renderCommitments(overview.commitments.filter((commitment) => commitment.status !== 'cancelled'));
  renderProfile(overview);
}

function renderProfile(overview) {
  const activeCommitments = overview.commitments.filter((c) => c.status !== 'cancelled');
  const scriptsContainer = el('profile-scripts');
  scriptsContainer.replaceChildren();

  // Actualizar resumen en la cabecera del perfil
  el('profile-stats-summary').textContent = `${activeCommitments.length} ${i18n.t('profileActiveCount')} · ${overview.stats.streak} ${i18n.t('streak')}`;

  if (activeCommitments.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'meta';
    empty.style.padding = '12px 0';
    empty.textContent = i18n.t('profileScriptsEmpty');
    scriptsContainer.append(empty);
    return;
  }

  const dayNames = i18n.t('dayNames');

  activeCommitments.forEach((commitment) => {
    const item = document.createElement('div');
    item.className = 'profile-script-item';

    const header = document.createElement('div');
    header.className = 'profile-script-header';

    const title = document.createElement('div');
    title.className = 'profile-script-title';
    title.textContent = commitment.scriptName ? `${commitment.scriptName} (${commitment.name})` : commitment.name;

    if (isRunning(commitment)) {
      const tag = document.createElement('span');
      tag.className = 'tag active';
      tag.textContent = i18n.t('statusActive');
      header.append(title, tag);
    } else {
      header.append(title);
    }

    const schedule = document.createElement('div');
    schedule.className = 'meta';
    schedule.textContent = `${commitment.days.map((d) => dayNames[d]).join(', ')} · ${commitment.startTime}-${commitment.endTime} (${commitment.startsAt.slice(0, 10)} → ${commitment.endsAt.slice(0, 10)})`;

    const domainsList = document.createElement('div');
    domainsList.className = 'profile-script-domains';
    commitment.blockedDomains.forEach((domain) => {
      const pill = document.createElement('span');
      pill.className = 'domain-pill';
      pill.textContent = domain;
      domainsList.append(pill);
    });

    item.append(header, schedule, domainsList);
    scriptsContainer.append(item);
  });
}

async function refreshOverview() {
  try {
    renderOverview(await window.codeMyLife.getOverview());
  } catch {
    el('stats').textContent = i18n.t('offline');
  }
}

async function cancelCommitment(id) {
  const errorLabel = el('commitment-error');
  errorLabel.textContent = '';
  try {
    await window.codeMyLife.cancelCommitment(id);
    await refreshOverview();
  } catch (error) {
    errorLabel.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
  }
}

function renderScriptResults(scripts) {
  const list = el('script-results');
  list.replaceChildren();

  if (scripts.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = i18n.t('noScripts');
    list.append(empty);
    return;
  }

  scripts.forEach((script) => {
    const item = document.createElement('li');

    const header = document.createElement('div');
    header.className = 'item-header';

    const title = document.createElement('strong');
    title.textContent = script.name;
    header.append(title);

    const useButton = document.createElement('button');
    useButton.type = 'button';
    useButton.className = 'ghost small';
    useButton.textContent = i18n.t('useScript');
    useButton.addEventListener('click', () => selectScript(script));
    header.append(useButton);

    const description = document.createElement('div');
    description.className = 'meta';
    description.textContent = script.description;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${script.category} · ${i18n.t('by')} ${script.authorName} · ${script.blockedDomains.join(', ')}`;

    item.append(header, description, meta);
    list.append(item);
  });
}

async function searchScripts(query) {
  try {
    renderScriptResults(await window.codeMyLife.searchScripts(query));
  } catch (error) {
    el('script-results').replaceChildren();
  }
}

function selectScript(script) {
  selectedScript = script;
  el('script-form').classList.add('hidden');
  el('selected-script-name').textContent = script.name;
  el('selected-script-description').textContent = script.description;
  el('selected-script-domains').textContent = `${i18n.t('fixedDomains')}: ${script.blockedDomains.join(', ')}`;
  el('commitment-name').value = script.name;
  el('custom-domains-field').classList.toggle('hidden', !script.allowCustomDomains);
  el('custom-domains').value = '';

  document.getElementById('script-browser').classList.add('hidden');
  el('commitment-form').classList.remove('hidden');
}

function backToScriptSearch() {
  selectedScript = null;
  el('commitment-form').classList.add('hidden');
  document.getElementById('script-browser').classList.remove('hidden');
}

function applyLanguage(language) {
  i18n.setLanguage(language);
  el('lang-app').textContent = i18n.language === 'es' ? 'EN' : 'ES';
  renderDayCheckboxes();
  setAuthMode(isRegisterMode);
  if (lastOverview) renderOverview(lastOverview);
  if (lastBlockingState) renderBlockingState(lastBlockingState);
  if (!el('app-view').classList.contains('hidden')) {
    void searchScripts(el('script-search').value);
  }
}

function switchTab(tab) {
  const isDashboard = tab === 'dashboard';
  el('tab-btn-dashboard').classList.toggle('active', isDashboard);
  el('tab-btn-profile').classList.toggle('active', !isDashboard);
  el('tab-dashboard').classList.toggle('hidden', !isDashboard);
  el('tab-profile').classList.toggle('hidden', isDashboard);
}

el('tab-btn-dashboard').addEventListener('click', () => switchTab('dashboard'));
el('tab-btn-profile').addEventListener('click', () => switchTab('profile'));

el('switch-mode').addEventListener('click', (event) => {
  event.preventDefault();
  setAuthMode(!isRegisterMode);
});

el('lang-auth').addEventListener('click', (event) => {
  event.preventDefault();
  applyLanguage(i18n.language === 'es' ? 'en' : 'es');
});

el('guest-continue').addEventListener('click', async () => {
  const errorLabel = el('auth-error');
  errorLabel.textContent = '';
  try {
    const user = await window.codeMyLife.continueAsGuest();
    showApp(user);
  } catch (error) {
    errorLabel.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
  }
});

el('lang-app').addEventListener('click', () => {
  applyLanguage(i18n.language === 'es' ? 'en' : 'es');
});

el('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorLabel = el('auth-error');
  errorLabel.textContent = '';

  try {
    const email = el('email').value.trim();
    const password = el('password').value;
    const user = isRegisterMode
      ? await window.codeMyLife.register(email, el('name').value.trim(), password)
      : await window.codeMyLife.login(email, password);
    el('password').value = '';
    showApp(user);
  } catch (error) {
    errorLabel.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
  }
});

el('logout').addEventListener('click', async () => {
  const banner = el('banner');
  try {
    await window.codeMyLife.logout();
    showAuth();
  } catch (error) {
    banner.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
    banner.classList.remove('hidden');
  }
});

el('commitment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorLabel = el('commitment-error');
  errorLabel.textContent = '';

  if (!selectedScript) {
    return;
  }

  const days = [...document.querySelectorAll('#days input:checked')].map((input) => Number(input.value));
  if (days.length === 0) {
    errorLabel.textContent = i18n.t('pickDay');
    return;
  }

  const customDomains = el('custom-domains')
    .value.split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);

  try {
    await window.codeMyLife.createCommitment({
      scriptId: selectedScript._id,
      name: el('commitment-name').value.trim(),
      customDomains,
      days,
      startTime: el('start-time').value,
      endTime: el('end-time').value,
      startsAt: new Date(`${el('starts-at').value}T00:00:00`).toISOString(),
      endsAt: new Date(`${el('ends-at').value}T23:59:59`).toISOString()
    });
    await refreshOverview();
    await refreshBlockingState();
  } catch (error) {
    errorLabel.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
  }
});

el('change-script').addEventListener('click', backToScriptSearch);

el('script-search').addEventListener('input', (event) => {
  clearTimeout(searchDebounce);
  const query = event.target.value;
  searchDebounce = setTimeout(() => void searchScripts(query), 250);
});

el('new-script-toggle').addEventListener('click', () => {
  el('script-form').classList.toggle('hidden');
});

el('script-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorLabel = el('script-error');
  errorLabel.textContent = '';

  const blockedDomains = el('script-domains')
    .value.split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);

  try {
    const script = await window.codeMyLife.createScript({
      name: el('script-name').value.trim(),
      category: el('script-category').value.trim(),
      description: el('script-description').value.trim(),
      blockedDomains,
      allowCustomDomains: el('script-allow-custom').checked
    });
    el('script-form').reset();
    el('script-form').classList.add('hidden');
    await searchScripts(el('script-search').value);
    selectScript(script);
  } catch (error) {
    errorLabel.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
  }
});

window.codeMyLife.onBlockingState(renderBlockingState);

(async function init() {
  renderDayCheckboxes();
  applyLanguage(i18n.language);

  const today = new Date();
  const inAWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  el('starts-at').value = toIsoDate(today);
  el('ends-at').value = toIsoDate(inAWeek);

  const user = await window.codeMyLife.getSession();
  if (user) {
    showApp(user);
  }
})();
