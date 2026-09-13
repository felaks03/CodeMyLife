const el = (id) => document.getElementById(id);
let lastOverview = null;
let lastBlockingState = null;
let availableScripts = [];
let instagramTimer = null;
let instagramTimerInterval = null;
let activeLocksInterval = null;

const DEFAULT_LOCK_CONFIG = Object.freeze({
  nameSuffix: ' - Weekly lock',
  customDomains: [],
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: '09:00',
  endTime: '18:00'
});

function scriptLockConfig(script) {
  if (script.blockingMode === 'daily-limit') {
    return {
      ...DEFAULT_LOCK_CONFIG,
      days: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '23:59',
      alwaysBlocked: true
    };
  }
  if (script.blockingMode === 'always') {
    return { ...DEFAULT_LOCK_CONFIG, alwaysBlocked: true };
  }
  return script.schedule ?? DEFAULT_LOCK_CONFIG;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function instagramUsageKey() {
  return `instagram-usage-${toIsoDate(new Date())}`;
}

function instagramUsedSeconds() {
  return Number(localStorage.getItem(instagramUsageKey()) ?? 0);
}

function saveInstagramUsedSeconds(seconds) {
  localStorage.setItem(instagramUsageKey(), String(Math.min(15 * 60, Math.max(0, seconds))));
}

function formatRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function renderInstagramTimer() {
  const remaining = Math.max(0, 15 * 60 - instagramUsedSeconds() - (instagramTimer?.liveSeconds ?? 0));
  document.querySelectorAll('[data-instagram-timer]').forEach((node) => {
    node.textContent = formatRemaining(remaining);
  });
  document.querySelectorAll('[data-instagram-action]').forEach((node) => {
    node.textContent = instagramTimer ? i18n.t('pauseInstagram') : i18n.t('useInstagram');
    node.disabled = remaining <= 0 && !instagramTimer;
  });
}

async function pauseInstagramTimer() {
  if (!instagramTimer) return;
  const usedSeconds = instagramTimer.liveSeconds;
  instagramTimer = null;
  if (instagramTimerInterval) clearInterval(instagramTimerInterval);
  instagramTimerInterval = null;
  await window.codeMyLife.pauseInstagramUsage();
  saveInstagramUsedSeconds(instagramUsedSeconds() + usedSeconds);
  renderInstagramTimer();
}

async function startInstagramTimer() {
  if (instagramTimer) return pauseInstagramTimer();
  if (instagramUsedSeconds() >= 15 * 60) return;
  instagramTimer = { startedAt: Date.now(), liveSeconds: 0 };
  await window.codeMyLife.startInstagramUsage();
  instagramTimerInterval = setInterval(() => {
    instagramTimer.liveSeconds = Math.floor((Date.now() - instagramTimer.startedAt) / 1000);
    if (instagramUsedSeconds() + instagramTimer.liveSeconds >= 15 * 60) {
      void pauseInstagramTimer();
      return;
    }
    renderInstagramTimer();
  }, 1000);
  renderInstagramTimer();
}

function syncInstagramPaused() {
  if (!instagramTimer) {
    renderInstagramTimer();
    return;
  }
  saveInstagramUsedSeconds(instagramUsedSeconds() + instagramTimer.liveSeconds);
  instagramTimer = null;
  if (instagramTimerInterval) clearInterval(instagramTimerInterval);
  instagramTimerInterval = null;
  renderInstagramTimer();
}

function showApp(user) {
  el('app-view').classList.remove('hidden');
  el('user-name').textContent = user.name;
  el('guest-banner').classList.remove('hidden');

  // Actualizar datos de perfil
  el('profile-name').textContent = user.name;
  el('profile-email').textContent = 'Almacenamiento local';
  el('profile-avatar').textContent = (user.name || 'P').charAt(0).toUpperCase();

  void refreshOverview();
  void refreshBlockingState();
  void loadScripts();
}

function renderBlockingState(state) {
  lastBlockingState = state;

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

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateActiveLockCountdowns() {
  const now = Date.now();
  document.querySelectorAll('[data-lock-end]').forEach((node) => {
    node.textContent = formatCountdown(Number(node.dataset.lockEnd) - now);
  });
}

function renderActiveLocks(commitments) {
  const section = el('active-locks');
  const list = el('active-lock-list');
  const activeLocks = commitments.filter(isRunning);
  const activeTestLocks = activeLocks.filter((commitment) => commitment.name.endsWith(' - Test lock'));
  el('exit-test-lock').classList.toggle('hidden', activeTestLocks.length === 0);
  list.replaceChildren();

  if (activeLocks.length === 0) {
    section.classList.add('hidden');
    if (activeLocksInterval) clearInterval(activeLocksInterval);
    activeLocksInterval = null;
    return;
  }

  activeLocks.forEach((commitment) => {
    const item = document.createElement('div');
    item.className = 'active-lock-item';

    const details = document.createElement('div');
    details.className = 'active-lock-details';
    const name = document.createElement('strong');
    name.textContent = commitment.scriptName;
    details.append(name);

    const countdown = document.createElement('div');
    countdown.className = 'active-lock-countdown';
    const label = document.createElement('span');
    label.textContent = i18n.t('timeRemaining');
    const value = document.createElement('strong');
    value.dataset.lockEnd = String(new Date(commitment.endsAt).getTime());
    countdown.append(label, value);

    item.append(details, countdown);
    list.append(item);
  });

  section.classList.remove('hidden');
  updateActiveLockCountdowns();
  if (activeLocksInterval) clearInterval(activeLocksInterval);
  activeLocksInterval = setInterval(updateActiveLockCountdowns, 1000);
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
    item.className = 'commitment-card';

    const header = document.createElement('div');
    header.className = 'commitment-header';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'commitment-title-block';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'commitment-eyebrow';
    eyebrow.textContent = commitment.scriptName;
    const title = document.createElement('strong');
    title.textContent = commitment.name;
    titleBlock.append(eyebrow, title);
    header.append(titleBlock);

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

    const details = document.createElement('div');
    details.className = 'commitment-details';

    const schedule = document.createElement('div');
    schedule.className = 'commitment-detail';
    const scheduleLabel = document.createElement('span');
    scheduleLabel.className = 'detail-label';
    scheduleLabel.textContent = i18n.t('scheduleLabel');
    const scheduleValue = document.createElement('strong');
    scheduleValue.textContent = `${commitment.days.map((day) => dayNames[day]).join(', ')} · ${commitment.startTime} - ${commitment.endTime}`;
    schedule.append(scheduleLabel, scheduleValue);

    const period = document.createElement('div');
    period.className = 'commitment-detail';
    const periodLabel = document.createElement('span');
    periodLabel.className = 'detail-label';
    periodLabel.textContent = i18n.t('periodLabel');
    const periodValue = document.createElement('strong');
    periodValue.textContent = `${commitment.startsAt.slice(0, 10)} → ${commitment.endsAt.slice(0, 10)}`;
    period.append(periodLabel, periodValue);

    const domains = document.createElement('div');
    domains.className = 'commitment-domains';
    const domainsLabel = document.createElement('span');
    domainsLabel.className = 'detail-label';
    domainsLabel.textContent = i18n.t('domainsLabel');
    const domainList = document.createElement('div');
    domainList.className = 'domain-list';
    commitment.blockedDomains.forEach((domain) => {
      const pill = document.createElement('span');
      pill.className = 'domain-pill';
      pill.textContent = domain;
      domainList.append(pill);
    });
    domains.append(domainsLabel, domainList);

    details.append(schedule, period);
    item.append(header, details, domains);
    list.append(item);
  });
}

function renderOverview(overview) {
  lastOverview = overview;
  const { stats } = overview;
  el('stats').textContent = `${stats.running} ${i18n.t('running')} · ${stats.completed} ${i18n.t('completed')} · ${stats.total} ${i18n.t('total')} · ${stats.streak} ${i18n.t('streak')}`;
  el('profile-stats-summary').textContent = `${stats.total} ${i18n.t('total')} · ${stats.streak} ${i18n.t('streak')}`;
  renderCalendar(overview.calendar);
  renderActiveLocks(overview.commitments);
  renderCommitments(overview.commitments.filter((commitment) => commitment.status !== 'cancelled'));
}

async function refreshOverview() {
  try {
    renderOverview(await window.codeMyLife.getOverview());
  } catch {
    el('stats').textContent = i18n.t('offline');
  }
}

el('exit-test-lock').addEventListener('click', async () => {
  const banner = el('banner');
  try {
    await window.codeMyLife.cancelTestLocks();
    banner.textContent = i18n.t('exitTestLockSuccess');
    banner.classList.remove('hidden');
    await refreshOverview();
    await refreshBlockingState();
  } catch (error) {
    banner.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
    banner.classList.remove('hidden');
  }
});

async function cancelCommitment(id) {
  const errorLabel = el('banner');
  errorLabel.textContent = '';
  try {
    await window.codeMyLife.cancelCommitment(id);
    await refreshOverview();
    errorLabel.textContent = i18n.t('cancelSuccess');
    errorLabel.classList.remove('hidden');
  } catch (error) {
    errorLabel.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
    errorLabel.classList.remove('hidden');
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
    item.className = 'script-card';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-expanded', 'false');
    item.setAttribute('aria-label', script.name);

    const header = document.createElement('div');
    header.className = 'script-card-header';

    const title = document.createElement('strong');
    title.className = 'script-card-title';
    title.textContent = script.name;
    header.append(title);

    const category = document.createElement('span');
    category.className = 'script-category';
    category.textContent = script.category;
    header.append(category);

    const details = document.createElement('div');
    details.className = 'script-card-details hidden';

    const meta = document.createElement('div');
    meta.className = 'meta script-card-meta';
    meta.textContent = script.authorName;

    const domains = document.createElement('div');
    domains.className = 'script-domain-list';
    if (script._id !== 'builtin-lust') {
      const domainsLabel = document.createElement('span');
      domainsLabel.className = 'detail-label';
      domainsLabel.textContent = i18n.t('scriptBlocks');
      domains.append(domainsLabel);
      script.blockedDomains.forEach((domain) => {
        const pill = document.createElement('span');
        pill.className = 'domain-pill';
        pill.textContent = domain;
        domains.append(pill);
      });
    }

    const configuration = document.createElement('div');
    configuration.className = 'script-configuration';
    const configurationLabel = document.createElement('span');
    configurationLabel.className = 'detail-label';
    configurationLabel.textContent = i18n.t('scriptSchedule');
    const configurationValue = document.createElement('strong');
    const config = scriptLockConfig(script);
    const days = config.days.map((day) => i18n.t('dayNames')[day]).join(', ');
    configurationValue.textContent = script._id === 'builtin-games'
      ? i18n.t('permanent')
      : script.dailyLimitMinutes
      ? `${i18n.t('dailyLimit')} · ${script.dailyLimitMinutes} min`
      : config.alwaysBlocked
        ? i18n.t('permanent')
        : `${days} · ${config.startTime} - ${config.endTime}`;
    configuration.append(configurationLabel, configurationValue);

    details.append(meta, domains, configuration);

    if (script._id === 'builtin-instagram') {
      const usage = document.createElement('div');
      usage.className = 'instagram-usage';
      const usageText = document.createElement('span');
      usageText.innerHTML = `${i18n.t('instagramRemaining')}: <strong data-instagram-timer>15:00</strong>`;
      const usageButton = document.createElement('button');
      usageButton.type = 'button';
      usageButton.className = 'instagram-action';
      usageButton.setAttribute('data-instagram-action', '');
      usageButton.textContent = i18n.t('useInstagram');
      usageButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        try {
          await startInstagramTimer();
        } catch (error) {
          instagramTimer = null;
          if (instagramTimerInterval) clearInterval(instagramTimerInterval);
          instagramTimerInterval = null;
          const banner = el('banner');
          banner.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
          banner.classList.remove('hidden');
          renderInstagramTimer();
        }
      });
      usage.append(usageText, usageButton);
      details.append(usage);
    }

    item.append(header, details);

    const toggleDetails = () => {
      const expanded = !details.classList.contains('hidden');
      details.classList.toggle('hidden', expanded);
      item.classList.toggle('expanded', !expanded);
      item.setAttribute('aria-expanded', String(!expanded));
    };
    item.addEventListener('click', toggleDetails);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleDetails();
      }
    });
    list.append(item);
  });
  renderInstagramTimer();
}

async function loadScripts() {
  try {
    availableScripts = await window.codeMyLife.listScripts();
    renderScriptResults(availableScripts);
  } catch (error) {
    el('script-results').replaceChildren();
  }
}

function weekBounds() {
  const startsAt = new Date();
  const sunday = new Date(startsAt);
  const daysUntilSunday = (7 - startsAt.getDay()) % 7;
  sunday.setDate(startsAt.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);
  return { startsAt, sunday };
}

function timeValue(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function testLockWindows(now) {
  const end = new Date(now.getTime() + 5 * 60 * 1000);
  const startTime = timeValue(now);
  const endTime = timeValue(end);

  if (now.toDateString() === end.toDateString()) {
    return [{
      days: [now.getDay()],
      startTime,
      endTime,
      startsAt: now.toISOString(),
      endsAt: end.toISOString()
    }];
  }

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const nextDay = new Date(end);
  return [
    {
      days: [now.getDay()],
      startTime,
      endTime: '23:59',
      startsAt: now.toISOString(),
      endsAt: endOfDay.toISOString()
    },
    {
      days: [nextDay.getDay()],
      startTime: '00:00',
      endTime,
      startsAt: new Date(endOfDay.getTime() + 1).toISOString(),
      endsAt: end.toISOString()
    }
  ];
}

el('test-lock').addEventListener('click', async () => {
  const banner = el('banner');
  banner.textContent = '';

  if (availableScripts.length === 0) {
    banner.textContent = i18n.t('noScripts');
    banner.classList.remove('hidden');
    return;
  }

  if (!window.confirm(i18n.t('testLockConfirm'))) return;

  const lockWindows = testLockWindows(new Date());
  el('test-lock').disabled = true;

  try {
    const testScripts = availableScripts.filter((script) => !script.showLockScreen);
    for (const script of testScripts) {
      for (const lockWindow of lockWindows) {
        await window.codeMyLife.createCommitment({
          scriptId: script._id,
          name: `${script.name} - Test lock`,
          customDomains: [],
          ...lockWindow
        });
      }
    }
    banner.textContent = i18n.t('testLockSuccess');
    banner.classList.remove('hidden');
    await refreshOverview();
    await refreshBlockingState();
  } catch (error) {
    banner.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
    banner.classList.remove('hidden');
  } finally {
    el('test-lock').disabled = false;
  }
});

el('lock-week').addEventListener('click', async () => {
  const errorLabel = el('banner');
  errorLabel.textContent = '';

  if (availableScripts.length === 0) {
    errorLabel.textContent = i18n.t('noScripts');
    errorLabel.classList.remove('hidden');
    return;
  }

  if (!window.confirm(i18n.t('lockWeekConfirm'))) return;

  const { startsAt, sunday } = weekBounds();
  const weekKey = startsAt.toISOString().slice(0, 10);
  const existingScripts = new Set(
    (lastOverview?.commitments ?? [])
      .filter((commitment) => commitment.startsAt.slice(0, 10) === weekKey && commitment.status !== 'cancelled')
      .map((commitment) => commitment.scriptId)
  );
  const scriptsToLock = availableScripts.filter((script) => !existingScripts.has(script._id));

  if (scriptsToLock.length === 0) {
    errorLabel.textContent = availableScripts.some((script) => script.blockingMode === 'daily-limit')
      ? i18n.t('dailyLimitPending')
      : i18n.t('lockWeekAlreadyActive');
    errorLabel.classList.remove('hidden');
    return;
  }

  el('lock-week').disabled = true;

  try {
    for (const script of scriptsToLock) {
      const config = scriptLockConfig(script);
      await window.codeMyLife.createCommitment({
        scriptId: script._id,
        name: `${script.name}${DEFAULT_LOCK_CONFIG.nameSuffix}`,
        customDomains: DEFAULT_LOCK_CONFIG.customDomains,
        days: config.days,
        startTime: config.startTime,
        endTime: config.endTime,
        startsAt: startsAt.toISOString(),
        endsAt: sunday.toISOString(),
        alwaysBlocked: config.alwaysBlocked ?? false
      });
    }
    errorLabel.textContent = i18n.t('lockWeekSuccess');
    errorLabel.classList.remove('hidden');
    await refreshOverview();
    await refreshBlockingState();
  } catch (error) {
    errorLabel.textContent = String(error.message ?? error).replace(/^Error:\s*/, '');
  } finally {
    el('lock-week').disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    if (!el('lock-week').disabled) el('lock-week').click();
  }
});

window.codeMyLife.onBlockingState(renderBlockingState);
window.codeMyLife.onInstagramPaused(syncInstagramPaused);
window.codeMyLife.onInstagramError((message) => {
  const banner = el('banner');
  banner.textContent = message;
  banner.classList.remove('hidden');
});

(async function init() {
  i18n.setLanguage('es');

  const user = await window.codeMyLife.getSession();
  showApp(user || { name: 'Mi perfil', id: 'personal', email: '' });
})();
