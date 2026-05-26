import { AVAILABLE_MARKETS } from '../lib/markets.js';
import {
  computeMarketStatus,
  formatDuration,
  formatLocalTime
} from '../lib/session.js';
import { renderCountryMap } from '../lib/country-maps.js';
import { getSettings, onChange } from '../lib/storage.js';
import { getMarketStatus } from '../lib/tradinghours.js';

const tpl = document.getElementById('market-card-tpl');
const marketsEl = document.getElementById('markets');
const emptyEl = document.getElementById('empty-state');
const summaryEl = document.getElementById('summary');
const summaryText = document.getElementById('summary-text');
const utcClock = document.getElementById('utc-clock');
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

function buildMarketList(settings) {
  const map = new Map();
  for (const m of AVAILABLE_MARKETS) map.set(m.id, m);
  for (const m of settings.customMarkets || []) map.set(m.id, m);
  const ids = settings.selectedMarketIds?.length ? settings.selectedMarketIds : [];
  return ids.map(id => map.get(id)).filter(Boolean);
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

function describeHours(market, status) {
  const base = market.sessions
    .map(s => `${s.open}–${s.close}`)
    .join(' · ');
  if (status?.isHalfDay) {
    return `Early close ${status.todayHoliday.closeAt} · ${market.timezone.replace('_', ' ')}`;
  }
  return `${base} · ${market.timezone.replace('_', ' ')}`;
}

/**
 * Overlay live TradingHours.com API status on top of our locally-computed
 * status when the user has connected the API.
 */
function applyApiOverride(status, market) {
  const apiKey = market.finId ? market.finId.toUpperCase() : null;
  if (!apiKey) return status;
  const live = apiStatusByFinId.get(apiKey);
  if (!live) return status;

  const merged = { ...status };
  const liveOpen = String(live.status || '').toLowerCase() === 'open';
  merged.isOpen = liveOpen;
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

function renderCard(market) {
  const baseStatus = computeMarketStatus(market);
  const status = applyApiOverride(baseStatus, market);
  const card = ensureCard(market);

  card.classList.toggle('open', status.isOpen);
  card.classList.toggle('closed', !status.isOpen);
  card.classList.toggle('holiday', !!status.isFullHoliday);
  card.classList.toggle('half-day', !!status.isHalfDay);

  card.querySelector('.flag').textContent = market.flag || '';
  card.querySelector('.market-name').textContent = market.name;
  card.querySelector('.status-label').textContent =
    status.isOpen ? 'Open' :
    status.isFullHoliday ? 'Holiday' :
    status.isHalfDay && !status.isOpen ? 'Closed (½ day)' :
    'Closed';
  card.querySelector('.local-time').textContent = status.localTime;
  card.querySelector('.local-day').textContent = status.localDay;
  card.querySelector('.countdown-label').textContent = status.countdownLabel;
  card.querySelector('.countdown-value').textContent =
    status.countdownMs == null ? '—' : formatDuration(status.countdownMs);
  card.querySelector('.hours-range').textContent = describeHours(market, status);

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
  const mapKey = `${market.id}:${market.countryCode || ''}`;
  if (!renderedMaps.has(mapKey)) {
    renderCountryMap(mapEl, market.countryCode);
    renderedMaps.add(mapKey);
  }

  return status;
}

function syncCards() {
  const wantedIds = new Set(selectedMarkets.map(m => m.id));
  for (const card of [...marketsEl.children]) {
    if (!wantedIds.has(card.dataset.id)) card.remove();
  }
  let openCount = 0;
  for (const m of selectedMarkets) {
    const st = renderCard(m);
    if (st.isOpen) openCount++;
  }
  return openCount;
}

function updateSummary(openCount) {
  if (!selectedMarkets.length) {
    summaryText.textContent = 'No markets selected';
    summaryEl.classList.add('closed');
    return;
  }
  summaryEl.classList.toggle('closed', openCount === 0);
  if (openCount === 0) {
    const upcoming = selectedMarkets
      .map(m => applyApiOverride(computeMarketStatus(m), m))
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

function updateUtcClock() {
  utcClock.textContent = formatLocalTime(new Date(), 'UTC') + ' UTC';
}

function tick() {
  updateUtcClock();
  const open = syncCards();
  updateSummary(open);
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
document.getElementById('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  openOptions();
});
document.getElementById('empty-open-options').addEventListener('click', openOptions);

onChange(() => init());

init();
