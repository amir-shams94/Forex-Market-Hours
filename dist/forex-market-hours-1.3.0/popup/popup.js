import { AVAILABLE_MARKETS } from '../lib/markets.js';
import {
  computeMarketStatus,
  formatDuration,
  formatLocalTime,
  formatSessionWindow,
  formatMarketTimezoneLabel,
  getUserTimezone
} from '../lib/session.js';
import { renderCountryMap } from '../lib/country-maps.js';
import { getSettings, onChange, updateSettings } from '../lib/storage.js';
import { getMarketStatus } from '../lib/tradinghours.js';

const tpl = document.getElementById('market-card-tpl');
const marketsEl = document.getElementById('markets');
const emptyEl = document.getElementById('empty-state');
const summaryEl = document.getElementById('summary');
const summaryText = document.getElementById('summary-text');
const utcClock = document.getElementById('utc-clock');
const userClock = document.getElementById('user-clock');
const dataSourceEl = document.getElementById('data-source');

let selectedMarkets = [];
let tickHandle = null;
let apiRefreshHandle = null;
let currentSettings = null;
const renderedMaps = new Set();
// Map of finId (uppercase) -> live API status payload (TradingHours v3 response).
let apiStatusByFinId = new Map();
let apiLastError = null;

const API_REFRESH_MS = 60_000;

const simBanner = document.getElementById('sim-banner');
const simTimeLabel = document.getElementById('sim-time-label');
const simResetBtn = document.getElementById('sim-reset-btn');
const timeSwapBtn = document.getElementById('time-swap-btn');
const swapBadge = document.getElementById('swap-badge');
const marketChangeBanner = document.getElementById('market-change-banner');
const marketChangeText = document.getElementById('market-change-text');
const formatToast = document.getElementById('format-toast');

/** @type {Map<string, boolean>} */
const previousOpenStates = new Map();
let statesReady = false;
let changeBannerTimer = null;
let formatToastTimer = null;

/**
 * Returns the date that the popup should render against. If the user has
 * activated time-travel mode via Settings, we honour that frozen timestamp;
 * otherwise we use the live wall clock.
 */
function effectiveNow() {
  const sim = currentSettings?.simulatedTime;
  if (!sim) return new Date();
  const d = new Date(sim);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function buildMarketList(settings) {
  const map = new Map();
  for (const m of AVAILABLE_MARKETS) map.set(m.id, m);
  for (const m of settings.customMarkets || []) map.set(m.id, m);
  const ids = settings.selectedMarketIds?.length ? settings.selectedMarketIds : [];
  return ids.map(id => map.get(id)).filter(Boolean);
}

function hoursMode() {
  const m = currentSettings?.hoursMode;
  if (m === 'exchange' || m === 'cash') return 'exchange';
  return 'fx';
}

function effectiveMarket(market) {
  const mode = hoursMode();
  const map = market.sessionsByMode;
  if (!map || typeof map !== 'object') return market;
  const sessions = map[mode] || map.fx || market.sessions;
  return { ...market, sessions };
}

/** Per-market label for the hours line and tooltips (not generic "CASH"). */
const MARKET_MODE_LABELS = {
  newyork: { fx: 'Forex NY session', exchange: 'NYSE (US stock market)' },
  sydney: { fx: 'Forex Sydney session', exchange: 'ASX (Australia stock market)' },
  tokyo: { fx: 'Forex Tokyo session', exchange: 'JPX (Japan stock market)' },
  frankfurt: { fx: 'Forex Frankfurt session', exchange: 'Xetra (Germany stock market)' },
  london: { fx: 'Forex London session', exchange: 'LSE (UK stock market)' },
  hongkong: { fx: 'Forex Hong Kong session', exchange: 'HKEX (Hong Kong stock market)' }
};

function marketHoursHeadline(market, mode) {
  return MARKET_MODE_LABELS[market.id]?.[mode]
    || (mode === 'fx' ? `Forex ${market.name} session` : `${market.name} exchange`);
}

function ensureCard(market) {
  let card = marketsEl.querySelector(`[data-id="${market.id}"]`);
  if (!card) {
    const fragment = tpl.content.cloneNode(true);
    card = fragment.querySelector('.market-card');
    card.dataset.id = market.id;
    marketsEl.appendChild(card);
  }
  return card;
}

/** Session hours in the market's own timezone (not the user's Windows timezone). */
function describeHoursForCard(market, now, timeFormat) {
  const mode = hoursMode();
  const headline = marketHoursHeadline(market, mode);
  const tzLabel = formatMarketTimezoneLabel(market.timezone, now);
  const city = market.timezone.split('/').pop().replace(/_/g, ' ');

  const parts = market.sessions.map((session) => {
    const range = formatSessionWindow(session, timeFormat);
    if (session.countsAsOpen === false) return `Pre-market ${range}`;
    if (session.name && !/^fx$/i.test(session.name)) return `${session.name} ${range}`;
    return range;
  });

  return `${headline} · ${city} (${tzLabel}) · ${parts.join(' · ')}`;
}

/**
 * Overlay live TradingHours.com API status on top of our locally-computed
 * status when the user has connected the API.
 */
function applyApiOverride(status, market) {
  if (!currentSettings?.useTradingHoursApi || !currentSettings?.tradingHoursApiKey) {
    return status;
  }
  const apiKey = market.finId ? market.finId.toUpperCase() : null;
  if (!apiKey) return status;
  const live = apiStatusByFinId.get(apiKey);
  if (!live) return status;

  const merged = { ...status };
  const liveOpen = String(live.status || '').toLowerCase() === 'open';
  merged.isOpen = liveOpen;
  if (!liveOpen && status.isPreMarket) merged.isPreMarket = true;
  merged.apiStatus = live;
  if (live.reason) merged.apiReason = live.reason;

  // Override countdown using the API's `until` timestamp when present.
  if (live.until) {
    const untilMs = Date.parse(live.until);
    if (!Number.isNaN(untilMs)) {
      const remaining = untilMs - Date.now();
      merged.countdownMs = remaining;
      merged.countdownLabel = liveOpen ? 'Closes in' : 'Opens in';
    }
  }
  return merged;
}

function renderCard(market, now) {
  const timeFormat = currentSettings?.timeFormat || '24h';
  const m = effectiveMarket(market);
  const baseStatus = computeMarketStatus(m, now, { timeFormat });
  const status = applyApiOverride(baseStatus, m);
  const card = ensureCard(m);

  card.classList.toggle('open', status.isOpen);
  card.classList.toggle('closed', !status.isOpen && !status.isPreMarket);
  card.classList.toggle('pre-market', !!status.isPreMarket);
  card.classList.toggle('holiday', !!status.isFullHoliday);
  card.classList.toggle('half-day', !!status.isHalfDay);

  card.querySelector('.flag').textContent = m.flag || '';
  card.querySelector('.market-name').textContent = m.name;
  card.querySelector('.status-label').textContent =
    status.isOpen ? 'Open' :
    status.isPreMarket ? 'Pre-market' :
    status.isFullHoliday ? 'Holiday' :
    status.isHalfDay && !status.isOpen ? 'Closed (½ day)' :
    'Closed';
  const mtz = formatMarketTimezoneLabel(m.timezone, now);
  card.querySelector('.local-time').textContent = `${status.localTime} ${mtz}`;
  card.querySelector('.local-day').textContent = `${status.localDay} · local`;

  if (status.isPreMarket && !status.isOpen) {
    const inPreSession = status.current?.session && status.current.session.countsAsOpen === false;
    const openNames = { newyork: 'NYSE', sydney: 'ASX', tokyo: 'JPX', frankfurt: 'Xetra' };
    const mainName = hoursMode() === 'exchange'
      ? (openNames[m.id] || 'Market')
      : 'Forex session';
    card.querySelector('.countdown-label').textContent = inPreSession
      ? `${mainName} opens`
      : 'Pre-market · opens in';
    const openAt = status.nextOpenLocal || (status.next?.session
      ? formatSessionWindow(status.next.session, timeFormat)
      : '—');
    card.querySelector('.countdown-value').textContent =
      `${openAt} · ${status.countdownMs == null ? '—' : formatDuration(status.countdownMs)}`;
  } else {
    card.querySelector('.countdown-label').textContent = status.countdownLabel;
    card.querySelector('.countdown-value').textContent =
      status.countdownMs == null ? '—' : formatDuration(status.countdownMs);
  }

  const hoursEl = card.querySelector('.hours-range');
  if (hoursEl) hoursEl.textContent = describeHoursForCard(m, now, timeFormat);

  const banner = card.querySelector('.holiday-banner');
  const text = banner.querySelector('.holiday-text');
  const showBanner = !!(status.todayHoliday || status.apiReason);
  banner.hidden = !showBanner;
  if (showBanner) {
    if (status.todayHoliday) {
      const h = status.todayHoliday;
      if (h.closeAt) {
        text.innerHTML = `<strong>${h.name}</strong> · early close at ${h.closeAt} local`;
      } else {
        text.innerHTML = `<strong>${h.name}</strong> · market closed all day`;
      }
    } else if (status.apiReason) {
      text.innerHTML = `<strong>${status.apiReason}</strong>`;
    }
  }

  const mapEl = card.querySelector('.card-map');
  const mapKey = `${m.id}:${m.countryCode || ''}`;
  if (!renderedMaps.has(mapKey)) {
    renderCountryMap(mapEl, m.countryCode);
    renderedMaps.add(mapKey);
  }

  return status;
}

function updateSwapButtonUi() {
  if (!timeSwapBtn || !swapBadge) return;
  const mode = hoursMode();
  const switchTo = mode === 'fx' ? 'exchange' : 'fx';
  timeSwapBtn.dataset.format = mode;
  // Badge = mode you switch TO (FX ↔ Exchange, not "CASH").
  swapBadge.textContent = switchTo === 'exchange' ? 'EXCH' : 'FX';
  timeSwapBtn.title = mode === 'exchange'
    ? 'Exchange hours (NYSE, ASX, …) · tap for Forex session'
    : 'Forex session hours · tap for Exchange (NYSE, ASX, …)';
  timeSwapBtn.setAttribute('aria-label', timeSwapBtn.title);
}

function showFormatToast(mode) {
  if (!formatToast) return;
  const examples = mode === 'exchange'
    ? 'NYSE 9:30 · ASX 10:00 · JPX 9:00 (each market’s local time)'
    : 'Forex NY 8:00 · Sydney 7:00 · Tokyo 9:00 (each market’s local time)';
  formatToast.textContent = mode === 'exchange'
    ? `Exchange hours · ${examples}`
    : `Forex session hours · ${examples}`;
  formatToast.hidden = false;
  clearTimeout(formatToastTimer);
  formatToastTimer = setTimeout(() => {
    formatToast.hidden = true;
  }, 3500);
}

function showMarketChange(change) {
  if (!marketChangeBanner || !marketChangeText) return;
  const { market, isOpen } = change;
  const verb = isOpen ? 'opened' : 'closed';
  marketChangeText.textContent = `${market.flag || ''} ${market.name} ${verb}`.trim();
  marketChangeBanner.hidden = false;
  marketChangeBanner.classList.toggle('is-open', isOpen);
  marketChangeBanner.classList.toggle('is-closed', !isOpen);

  const card = marketsEl.querySelector(`[data-id="${market.id}"]`);
  if (card) {
    card.classList.add('just-changed');
    setTimeout(() => card.classList.remove('just-changed'), 4500);
  }

  clearTimeout(changeBannerTimer);
  changeBannerTimer = setTimeout(() => {
    marketChangeBanner.hidden = true;
  }, 10000);
}

function detectMarketTransitions(now) {
  const timeFormat = currentSettings?.timeFormat || '24h';
  const changes = [];
  for (const m of selectedMarkets) {
    const em = effectiveMarket(m);
    const st = applyApiOverride(computeMarketStatus(em, now, { timeFormat }), em);
    const prev = previousOpenStates.get(m.id);
    if (statesReady && prev !== undefined && prev !== st.isOpen) {
      changes.push({ market: m, isOpen: st.isOpen });
    }
    previousOpenStates.set(m.id, st.isOpen);
  }
  if (!statesReady) statesReady = true;
  if (changes.length) showMarketChange(changes[changes.length - 1]);
}

function syncCards(now) {
  const wantedIds = new Set(selectedMarkets.map(m => m.id));
  for (const card of [...marketsEl.children]) {
    if (!wantedIds.has(card.dataset.id)) card.remove();
  }
  for (const id of [...previousOpenStates.keys()]) {
    if (!wantedIds.has(id)) previousOpenStates.delete(id);
  }
  let openCount = 0;
  for (const m of selectedMarkets) {
    const st = renderCard(m, now);
    if (st.isOpen) openCount++;
  }
  detectMarketTransitions(now);
  return openCount;
}

function updateSummary(openCount, now) {
  if (!selectedMarkets.length) {
    summaryText.textContent = 'No markets selected';
    summaryEl.classList.add('closed');
    return;
  }
  summaryEl.classList.toggle('closed', openCount === 0);
  if (openCount === 0) {
    const timeFormat = currentSettings?.timeFormat || '24h';
    const upcoming = selectedMarkets
      .map(m => applyApiOverride(computeMarketStatus(m, now, { timeFormat }), m))
      .filter(s => s.next)
      .sort((a, b) => a.opensIn - b.opensIn)[0];
    if (upcoming) {
      summaryText.textContent =
        `All ${selectedMarkets.length} markets closed · ${upcoming.market.name} opens in ${formatDuration(upcoming.opensIn)}`;
    } else {
      summaryText.textContent = `All ${selectedMarkets.length} markets closed`;
    }
  } else {
    summaryText.textContent =
      `${openCount} of ${selectedMarkets.length} market${selectedMarkets.length > 1 ? 's' : ''} open`;
  }
}

function updateUtcClock(now) {
  const timeFormat = currentSettings?.timeFormat || '24h';
  const userTz = getUserTimezone();
  utcClock.textContent = formatLocalTime(now, 'UTC', { timeFormat }) + ' UTC';
  if (userClock) {
    const short = userTz.split('/').pop().replace(/_/g, ' ');
    userClock.textContent =
      'You: ' + formatLocalTime(now, userTz, { timeFormat }) + ' · ' + short;
  }
}

function updateSimBanner(now) {
  if (!simBanner) return;
  const sim = currentSettings?.simulatedTime;
  if (sim) {
    simBanner.hidden = false;
    const fmt = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    simTimeLabel.textContent = fmt.format(now);
  } else {
    simBanner.hidden = true;
  }
}

function tick() {
  const now = effectiveNow();
  updateSwapButtonUi();
  updateUtcClock(now);
  updateSimBanner(now);
  const open = syncCards(now);
  updateSummary(open, now);
  emptyEl.classList.toggle('hidden', selectedMarkets.length > 0);
  marketsEl.style.display = selectedMarkets.length ? '' : 'none';
  updateDataSourceLabel();
}

function updateDataSourceLabel() {
  if (!currentSettings) return;
  const apiEnabled = currentSettings.useTradingHoursApi && currentSettings.tradingHoursApiKey;
  if (apiEnabled && apiStatusByFinId.size > 0) {
    dataSourceEl.textContent = 'TradingHours.com · live';
    dataSourceEl.style.color = '#86efac';
  } else if (apiEnabled && apiLastError) {
    dataSourceEl.textContent = 'TradingHours.com · offline';
    dataSourceEl.style.color = '#fca5a5';
  } else if (apiEnabled) {
    dataSourceEl.textContent = 'TradingHours.com · loading…';
    dataSourceEl.style.color = '';
  } else {
    dataSourceEl.textContent = 'Local engine + 2026 holidays';
    dataSourceEl.style.color = '';
  }
}

async function refreshApiStatus() {
  if (!currentSettings) return;
  const apiEnabled = currentSettings.useTradingHoursApi && currentSettings.tradingHoursApiKey;
  if (!apiEnabled) {
    apiStatusByFinId = new Map();
    apiLastError = null;
    return;
  }
  const finIds = [...new Set(
    selectedMarkets.map(m => m.finId).filter(Boolean)
  )];
  if (!finIds.length) {
    apiStatusByFinId = new Map();
    apiLastError = null;
    return;
  }
  try {
    const list = await getMarketStatus(currentSettings.tradingHoursApiKey, finIds);
    const map = new Map();
    for (const row of list) {
      const id = (row.fin_id || row.finId || '').toUpperCase();
      if (id) map.set(id, row);
    }
    apiStatusByFinId = map;
    apiLastError = null;
  } catch (e) {
    apiLastError = e.message || String(e);
    console.warn('TradingHours API refresh failed:', apiLastError);
  }
  updateDataSourceLabel();
}

async function init() {
  currentSettings = await getSettings();
  selectedMarkets = buildMarketList(currentSettings);
  renderedMaps.clear();
  marketsEl.innerHTML = '';
  statesReady = false;
  previousOpenStates.clear();
  if (marketChangeBanner) marketChangeBanner.hidden = true;
  updateSwapButtonUi();
  tick();
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(tick, 1000);

  if (apiRefreshHandle) clearInterval(apiRefreshHandle);
  await refreshApiStatus();
  apiRefreshHandle = setInterval(refreshApiStatus, API_REFRESH_MS);
}

function openOptions() {
  if (chrome?.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options/options.html'));
  }
}

document.getElementById('settings-btn').addEventListener('click', openOptions);
timeSwapBtn?.addEventListener('click', async () => {
  const current = hoursMode();
  const next = current === 'fx' ? 'exchange' : 'fx';
  await updateSettings({ hoursMode: next });
  currentSettings = { ...currentSettings, hoursMode: next };
  updateSwapButtonUi();
  showFormatToast(next);
  tick();
});
document.getElementById('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  openOptions();
});
document.getElementById('empty-open-options').addEventListener('click', openOptions);

if (simResetBtn) {
  simResetBtn.addEventListener('click', async () => {
    const { updateSettings } = await import('../lib/storage.js');
    await updateSettings({ simulatedTime: null });
  });
}

onChange(() => init());

init();
