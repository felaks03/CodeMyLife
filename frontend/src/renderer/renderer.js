const el = (id) => document.getElementById(id);
let lastOverview = null;
let lastBlockingState = null;
let availableScripts = [];
let instagramTimer = null;
let instagramTimerInterval = null;
let activeLocksInterval = null;
let videoTimerInterval = null;
let noticeTimer = null;
let wallet = null;
let shopItems = [];

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

function instagramBonusKey() {
  return 'instagram-bonus-seconds';
}

function instagramUsedSeconds() {
  return Number(localStorage.getItem(instagramUsageKey()) ?? 0);
}

function instagramBonusSeconds() {
  return Math.max(0, Number(localStorage.getItem(instagramBonusKey()) ?? 0));
}

function addInstagramBonusSeconds(seconds) {
  localStorage.setItem(instagramBonusKey(), String(instagramBonusSeconds() + seconds));
}

function saveInstagramUsedSeconds(seconds) {
  localStorage.setItem(instagramUsageKey(), String(Math.min(15 * 60, Math.max(0, seconds))));
}

function saveInstagramSessionSeconds(seconds) {
  const freeUsed = instagramUsedSeconds();
  const freeRemaining = Math.max(0, 15 * 60 - freeUsed);
  const nextFreeUsed = Math.min(15 * 60, freeUsed + seconds);
  const bonusSpent = Math.max(0, seconds - freeRemaining);
  saveInstagramUsedSeconds(nextFreeUsed);
  localStorage.setItem(instagramBonusKey(), String(Math.max(0, instagramBonusSeconds() - bonusSpent)));
}

function formatRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function renderInstagramTimer() {
  const activePurchase = wallet?.purchases.find((purchase) => purchase.itemId === 'instagram-time' && purchase.startedAt && !purchase.usedAt);
  const purchasedSeconds = wallet?.purchases
    .filter((purchase) => purchase.itemId === 'instagram-time' && !purchase.usedAt && purchase !== activePurchase)
    .reduce((total, purchase) => total + Number(purchase.remainingSeconds ?? 0), 0) ?? 0;
  const sessionSeconds = activePurchase
    ? Number(activePurchase.remainingSeconds ?? 0)
    : 0;
  const remaining = Math.max(0, 15 * 60 - instagramUsedSeconds() + purchasedSeconds + sessionSeconds - (instagramTimer?.liveSeconds ?? 0));
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
  if (instagramTimer.purchaseId) {
    wallet = await window.codeMyLife.pauseShopItem(instagramTimer.purchaseId);
    await window.codeMyLife.pauseInstagramUsage();
  } else {
    await window.codeMyLife.pauseInstagramUsage();
    saveInstagramSessionSeconds(usedSeconds);
  }
  renderInstagramTimer();
}

async function startInstagramTimer(purchaseId = null) {
  if (instagramTimer) return pauseInstagramTimer();
  if (!purchaseId && instagramUsedSeconds() >= 15 * 60) return;
  instagramTimer = { startedAt: Date.now(), liveSeconds: 0, purchaseId };
  await window.codeMyLife.startInstagramUsage();
  instagramTimerInterval = setInterval(() => {
    instagramTimer.liveSeconds = Math.floor((Date.now() - instagramTimer.startedAt) / 1000);
    const activePurchase = purchaseId ? wallet?.purchases.find((purchase) => purchase.id === purchaseId) : null;
    const sessionLimit = purchaseId
      ? Number(activePurchase?.remainingSeconds ?? 0)
      : Math.max(0, 15 * 60 - instagramUsedSeconds());
    if (instagramTimer.liveSeconds >= sessionLimit) {
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
  if (!instagramTimer.purchaseId) saveInstagramSessionSeconds(instagramTimer.liveSeconds);
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
  void loadEconomy();
  void window.codeMyLife.isDevelopment().then((development) => {
    el('skip-daily-focus').classList.toggle('hidden', !development);
  });
}

el('skip-daily-focus').addEventListener('click', async () => {
  try {
    await window.codeMyLife.skipDailyFocusToday();
    showNotice('Bloqueo diario omitido solo por hoy.', 'success');
  } catch (error) {
    showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
  }
});

function renderBlockingState(state) {
  lastBlockingState = state;

  const banner = el('banner');
  if (state.lastError) {
    el('banner-message').textContent = state.lastError;
    banner.classList.remove('success');
    banner.classList.add('error');
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function showNotice(message, type = 'error') {
  const banner = el('banner');
  el('banner-message').textContent = message;
  banner.classList.toggle('success', type === 'success');
  banner.classList.toggle('error', type !== 'success');
  banner.classList.remove('hidden');
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => banner.classList.add('hidden'), 10000);
}

el('banner-close').addEventListener('click', () => {
  el('banner').classList.add('hidden');
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = null;
});

function renderEconomy() {
  if (!wallet) return;
  el('coin-balance').textContent = `${wallet.coins} ${i18n.t('coins')}`;
  renderInventory();
  const shopList = el('shop-list');
  shopList.replaceChildren();
  shopItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'economy-item';
    const copy = document.createElement('div');
    copy.className = 'economy-copy';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const description = document.createElement('span');
    description.textContent = item.description;
    copy.append(name, description);
    const duration = document.createElement('span');
    duration.className = 'shop-duration';
    duration.textContent = `${item.durationMinutes} min desbloqueados`;
    copy.append(duration);
    const offer = document.createElement('div');
    offer.className = 'shop-offer';
    const price = document.createElement('strong');
    price.className = 'shop-price';
    price.textContent = String(item.costCoins);
    const priceLabel = document.createElement('span');
    priceLabel.textContent = i18n.t('coins');
    offer.append(price, priceLabel);
    const buy = document.createElement('button');
    buy.className = 'economy-action buy-action';
    buy.type = 'button';
    buy.textContent = i18n.t('buy');
    buy.disabled = wallet.coins < item.costCoins;
    buy.setAttribute('aria-label', `Comprar ${item.name}`);
    if (buy.disabled) {
      buy.setAttribute('aria-disabled', 'true');
      buy.setAttribute('aria-description', `Necesitas ${item.costCoins - wallet.coins} monedas mas`);
    }
    buy.addEventListener('click', () => void purchaseItem(item.id, buy));
    row.append(copy, offer, buy);
    shopList.append(row);
  });
}

function renderInventory() {
  const list = el('inventory-list');
  const count = el('inventory-count');
  if (!list || !count || !wallet) return;
  const itemsById = new Map(shopItems.map((item) => [item.id, item]));
  const available = wallet.purchases.filter((purchase) => !purchase.usedAt);
  const gamePurchases = available.filter((purchase) => purchase.itemId === 'games-time');
  const activeGame = gamePurchases.find((purchase) => purchase.startedAt);
  const gameItem = itemsById.get('games-time');
  const activeSeconds = activeGame
    ? Number(activeGame.remainingSeconds ?? gameItem?.durationMinutes * 60 ?? 0)
    : 0;
  const pendingSeconds = gamePurchases
    .filter((purchase) => purchase !== activeGame)
    .reduce((total, purchase) => total + Number(purchase.remainingSeconds ?? gameItem?.durationMinutes * 60 ?? 0), 0);
  const gameSeconds = activeSeconds + pendingSeconds;
  const canonicalGame = activeGame ?? gamePurchases[0] ?? null;
  count.textContent = `${Math.ceil(gameSeconds / 60)} min disponibles`;
  list.replaceChildren();

  const instagramRow = document.createElement('div');
  instagramRow.className = 'inventory-item inventory-time-row is-available inventory-instagram-item';
  const instagramCopy = document.createElement('div');
  instagramCopy.className = 'inventory-copy';
  const instagramName = document.createElement('strong');
  instagramName.textContent = 'Instagram';
  const instagramDetail = document.createElement('span');
  instagramDetail.textContent = '15 minutos gratis al dia + tiempo comprado';
  instagramCopy.append(instagramName, instagramDetail);
  const instagramStatus = document.createElement('span');
  instagramStatus.className = 'inventory-timer inventory-instagram-timer';
  instagramStatus.dataset.instagramTimer = '';
  const instagramAction = document.createElement('button');
  instagramAction.className = 'economy-action inventory-action';
  instagramAction.type = 'button';
  instagramAction.setAttribute('data-instagram-action', '');
  instagramAction.addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      const activeInstagramPurchase = wallet.purchases.find((purchase) =>
        purchase.itemId === 'instagram-time' && purchase.startedAt && !purchase.usedAt
      );
      const pendingInstagramPurchase = wallet.purchases.find((purchase) =>
        purchase.itemId === 'instagram-time' && !purchase.startedAt && !purchase.usedAt
      );
      if (instagramTimer) {
        await pauseInstagramTimer();
      } else if (instagramUsedSeconds() < 15 * 60) {
        await startInstagramTimer();
      } else if (activeInstagramPurchase) {
        await startInstagramTimer(activeInstagramPurchase.id);
      } else if (pendingInstagramPurchase) {
        await useShopItem(pendingInstagramPurchase.id, instagramAction);
      }
    } catch (error) {
      instagramTimer = null;
      if (instagramTimerInterval) clearInterval(instagramTimerInterval);
      instagramTimerInterval = null;
      showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
      renderInstagramTimer();
    }
  });
  instagramRow.append(instagramCopy, instagramStatus, instagramAction);
  list.append(instagramRow);

  if (!canonicalGame) {
    const empty = document.createElement('p');
    empty.className = 'inventory-empty';
    empty.textContent = 'Todavia no tienes objetos. Compra una recompensa para verla aqui.';
    list.append(empty);
  } else {
    const row = document.createElement('div');
    row.className = `inventory-item inventory-time-row ${activeGame ? 'is-active' : 'is-available'}`;
    const copy = document.createElement('div');
    copy.className = 'inventory-copy';
    const name = document.createElement('strong');
    name.textContent = 'Tiempo de videojuegos';
    const description = document.createElement('span');
    description.textContent = 'Tiempo comprado acumulado';
    copy.append(name, description);
    const detail = document.createElement('span');
    detail.className = 'inventory-timer inventory-video-timer';
    detail.dataset.videoTimer = canonicalGame.id;
    detail.textContent = formatVideoRemaining(gameSeconds);
    const action = document.createElement('button');
    action.className = 'economy-action inventory-action';
    action.type = 'button';
    action.textContent = activeGame ? 'Pausar' : 'Usar Juegos';
    action.setAttribute('aria-label', activeGame ? 'Pausar tiempo de videojuegos' : 'Usar tiempo de videojuegos');
    action.setAttribute('aria-pressed', String(Boolean(activeGame)));
    action.addEventListener('click', () => void (activeGame
      ? pauseShopItem(canonicalGame.id, action)
      : useShopItem(canonicalGame.id, action)));
    row.append(copy, detail, action);
    list.append(row);
  }
  startVideoTimerTicker();
  renderInstagramTimer();
}

function formatVideoRemaining(seconds) {
  const totalSeconds = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function startVideoTimerTicker() {
  if (videoTimerInterval) clearInterval(videoTimerInterval);
  const activePurchase = wallet?.purchases.find((purchase) => purchase.itemId === 'games-time' && purchase.startedAt && !purchase.usedAt);
  if (!activePurchase) return;
  videoTimerInterval = setInterval(async () => {
    const current = wallet?.purchases.find((purchase) => purchase.id === activePurchase.id);
    if (!current?.startedAt) {
      clearInterval(videoTimerInterval);
      videoTimerInterval = null;
      return;
    }
    const trustedNow = new Date(await window.codeMyLife.getTrustedTime());
    const elapsed = Math.max(0, Math.floor((trustedNow.getTime() - new Date(current.startedAt).getTime()) / 1000));
    const unlockRemaining = current.unlockUntil
      ? Math.max(0, Math.ceil((new Date(current.unlockUntil).getTime() - trustedNow.getTime()) / 1000))
      : 0;
    const remaining = Math.max(
      0,
      Number(current.remainingSeconds ?? 0) - elapsed,
      unlockRemaining
    );
    document.querySelectorAll(`[data-video-timer="${current.id}"]`).forEach((node) => {
      node.textContent = formatVideoRemaining(remaining);
    });
    if (remaining <= 0) {
      await pauseShopItem(current.id, null);
    }
  }, 1000);
}

async function loadEconomy() {
  try {
    [wallet, shopItems] = await Promise.all([
      window.codeMyLife.getWallet(),
      window.codeMyLife.listShop()
    ]);
    renderEconomy();
  } catch {
    showNotice(i18n.t('economyOffline'));
  }
}

async function purchaseItem(itemId, button) {
  if (!window.confirm(i18n.t('purchaseConfirm'))) return;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Comprando...';
  try {
    wallet = await window.codeMyLife.purchaseShopItem(itemId);
    renderEconomy();
    showNotice('Objeto guardado en Mis objetos. Pulsa Usar cuando quieras activar el tiempo.', 'success');
  } catch (error) {
    showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
    button.disabled = wallet.coins < (shopItems.find((item) => item.id === itemId)?.costCoins ?? 0);
    button.textContent = originalLabel;
  }
}

async function useShopItem(purchaseId, button) {
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Activando...';
  try {
    const purchase = wallet.purchases.find((entry) => entry.id === purchaseId);
    const shopItem = shopItems.find((item) => item.id === purchase?.itemId);
    wallet = await window.codeMyLife.useShopItem(purchaseId);
    if (shopItem?.id === 'instagram-time') {
      await startInstagramTimer(purchaseId);
      renderInstagramTimer();
    }
    renderEconomy();
    await refreshBlockingState();
    showNotice(shopItem?.id === 'instagram-time'
      ? 'Tiempo de Instagram activado.'
      : 'Tiempo de videojuegos activado.', 'success');
  } catch (error) {
    showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function pauseShopItem(purchaseId, button) {
  if (button) {
    button.disabled = true;
    button.textContent = 'Guardando...';
  }
  try {
    wallet = await window.codeMyLife.pauseShopItem(purchaseId);
    renderEconomy();
    await refreshBlockingState();
    showNotice('Tiempo restante guardado.', 'success');
  } catch (error) {
    showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
    if (button) {
      button.disabled = false;
      button.textContent = 'Pausar';
    }
  }
}

async function refreshBlockingState() {
  try {
    renderBlockingState(await window.codeMyLife.getBlockingState());
  } catch {
    // The scheduler pushes updates as soon as it has a state.
  }
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

function renderOverview(overview) {
  lastOverview = overview;
  renderActiveLocks(overview.commitments);
}

async function refreshOverview() {
  try {
    renderOverview(await window.codeMyLife.getOverview());
  } catch {
    showNotice(i18n.t('offline'));
  }
}

async function cancelCommitment(id) {
  try {
    await window.codeMyLife.cancelCommitment(id);
    await refreshOverview();
    showNotice(i18n.t('cancelSuccess'), 'success');
  } catch (error) {
    showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
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
          showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
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

async function trustedNow() {
  return new Date(await window.codeMyLife.getTrustedTime());
}

function weekBounds(now) {
  const startsAt = new Date(now);
  const sunday = new Date(startsAt);
  const daysUntilSunday = (7 - startsAt.getDay()) % 7;
  sunday.setDate(startsAt.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);
  return { startsAt, sunday };
}

el('lock-week').addEventListener('click', async () => {
  if (availableScripts.length === 0) {
    showNotice(i18n.t('noScripts'));
    return;
  }

  if (!window.confirm(i18n.t('lockWeekConfirm'))) return;

  const { startsAt, sunday } = weekBounds(await trustedNow());
  const weekKey = startsAt.toISOString().slice(0, 10);
  const existingScripts = new Set(
    (lastOverview?.commitments ?? [])
      .filter((commitment) => commitment.startsAt.slice(0, 10) === weekKey && commitment.status !== 'cancelled')
      .map((commitment) => commitment.scriptId)
  );
  const scriptsToLock = availableScripts.filter((script) => !existingScripts.has(script._id));

  if (scriptsToLock.length === 0) {
    showNotice(i18n.t('lockWeekAlreadyActive'));
    return;
  }

  const lockButton = el('lock-week');
  const lockButtonLabel = lockButton.textContent;
  lockButton.disabled = true;
  lockButton.textContent = 'Aplicando...';

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
    showNotice(i18n.t('lockWeekSuccess'), 'success');
    await refreshOverview();
    await refreshBlockingState();
  } catch (error) {
    showNotice(String(error.message ?? error).replace(/^Error:\s*/, ''));
  } finally {
    lockButton.disabled = false;
    lockButton.textContent = lockButtonLabel;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    if (!el('lock-week').disabled) el('lock-week').click();
  }
});

window.codeMyLife.onBlockingState(renderBlockingState);
window.codeMyLife.onUpdateAvailable((version) => {
  showNotice(`Actualizacion ${version} disponible. Se descargara automaticamente.`, 'success');
});
window.codeMyLife.onUpdateChecking(() => {
  const button = el('check-for-updates');
  if (button) {
    button.disabled = true;
    button.textContent = 'Buscando actualizaciones...';
  }
});
window.codeMyLife.onUpdateNotAvailable(() => {
  const button = el('check-for-updates');
  if (button) {
    button.disabled = false;
    button.textContent = 'Buscar actualizaciones';
  }
  showNotice('Ya tienes la ultima version.', 'success');
});
window.codeMyLife.onUpdateDownloaded((version) => {
  showNotice(`Actualizacion ${version} descargada. Se instalara automaticamente.`, 'success');
});
window.codeMyLife.onUpdateError((message) => {
  const button = el('check-for-updates');
  if (button) {
    button.disabled = false;
    button.textContent = 'Buscar actualizaciones';
  }
  showNotice(`No se pudo actualizar la aplicacion: ${message}`);
});
el('check-for-updates')?.addEventListener('click', () => {
  void window.codeMyLife.checkForUpdates().catch((error) => {
    showNotice(`No se pudo buscar actualizaciones: ${String(error.message ?? error)}`);
  });
});
window.codeMyLife.onInstagramPaused(syncInstagramPaused);
window.codeMyLife.onPauseTimers(() => {
  if (instagramTimer) void pauseInstagramTimer();
});
window.codeMyLife.onInstagramError((message) => {
  showNotice(message);
});

window.addEventListener('beforeunload', () => {
  if (instagramTimer) saveInstagramSessionSeconds(instagramTimer.liveSeconds);
});

(async function init() {
  i18n.setLanguage('es');

  const version = await window.codeMyLife.getAppVersion();
  el('app-version').textContent = `v${version}`;
  const user = await window.codeMyLife.getSession();
  showApp(user || { name: 'Mi perfil', id: 'personal', email: '' });
})();

