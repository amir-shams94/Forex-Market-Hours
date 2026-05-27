import { AVAILABLE_MARKETS } from '../lib/markets.js';
import {
  computeMarketStatus,
  formatDuration,
  formatOpensIn,
  formatLocalTime,
  formatSessionTime,
  formatSessionWindow,
  formatSessionTimesInUserTz,
  ensurePreMarketSessions,
  getUserTimezone,
  zonedTimeToUtc,
  getZonedParts
} from '../lib/session.js';
import { renderCountryMap } from '../lib/country-maps.js';
import { getSettings, onChange, updateSettings } from '../lib/storage.js';
import {
  fetchStatusForMarkets,
  fetchHolidaysForMarkets,
  getFinnhubExchange
} from '../lib/finnhub.js';
import { setRuntimeHolidays, clearRuntimeHolidays } from '../lib/holidays.js';

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
// marketId -> live Finnhub market-status payload
let apiStatusByMarketId = new Map();
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
  const m = String(currentSettings?.hoursMode || 'fx').toLowerCase();
  if (m === 'exchange' || m === 'cash' || m === 'exch') return 'exchange';
  return 'fx';
}

/** Session rows on cards: FX = forex hours, EXCH = exchange hours (same as tradinghours.com). */
function sessionMode(market) {
  return hoursMode();
}

/** Markets with dedicated `sessionsByMode.fx` / `.exchange` rows in markets.js. */
const FOREX_HUB_IDS = new Set([
  'sydney', 'tokyo', 'hongkong', 'frankfurt', 'london', 'newyork'
]);

// FX session tables shown on many Iranian websites are anchored to New York time (ET),
// e.g. Sydney open 18:00 ET, Tokyo open 19:00 ET, London open 03:00 ET, NY open 08:00 ET.
// We compute "your time" from these ET anchors so DST is handled automatically.
const FX_ET_BY_MARKET_ID = {
  sydney: { open: '18:00', close: '03:00' },
  tokyo: { open: '19:00', close: '04:00' },
  london: { open: '03:00', close: '12:00' },
  newyork: { open: '08:00', close: '17:00' }
};

function parseHHMM(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

function formatFxEtInUserTz(marketId, now, timeFormat) {
  const def = FX_ET_BY_MARKET_ID[marketId];
  if (!def) return null;

  const userTz = getUserTimezone();
  const etTz = 'America/New_York';
  const etParts = getZonedParts(now, etTz);

  const openMin = parseHHMM(def.open);
  const closeMin = parseHHMM(def.close);

  const openUtc = zonedTimeToUtc(
    etTz,
    etParts.year,
    etParts.month,
    etParts.day,
    Math.floor(openMin / 60),
    openMin % 60
  );

  const closeDay =
    closeMin > openMin
      ? { y: etParts.year, mo: etParts.month, d: etParts.day }
      : (() => {
          const next = new Date(Date.UTC(etParts.year, etParts.month - 1, etParts.day) + 24 * 60 * 60 * 1000);
          return { y: next.getUTCFullYear(), mo: next.getUTCMonth() + 1, d: next.getUTCDate() };
        })();

  const closeUtc = zonedTimeToUtc(
    etTz,
    closeDay.y,
    closeDay.mo,
    closeDay.d,
    Math.floor(closeMin / 60),
    closeMin % 60
  );

  return {
    open: formatLocalTime(openUtc, userTz, { timeFormat, includeSeconds: false }),
    close: formatLocalTime(closeUtc, userTz, { timeFormat, includeSeconds: false })
  };
}

function nextEtOpenCloseUtc(marketId, now) {
  const def = FX_ET_BY_MARKET_ID[marketId];
  if (!def) return null;
  const etTz = 'America/New_York';
  const etParts = getZonedParts(now, etTz);

  const openMin = parseHHMM(def.open);
  const closeMin = parseHHMM(def.close);

  const openUtcFor = (y, mo, d) =>
    zonedTimeToUtc(etTz, y, mo, d, Math.floor(openMin / 60), openMin % 60);

  const closeUtcForOpenUtc = (openUtc) => {
    const openDayEt = getZonedParts(openUtc, etTz);
    const closeDay =
      closeMin > openMin
        ? { y: openDayEt.year, mo: openDayEt.month, d: openDayEt.day }
        : (() => {
            const next = new Date(Date.UTC(openDayEt.year, openDayEt.month - 1, openDayEt.day) + 24 * 60 * 60 * 1000);
            return { y: next.getUTCFullYear(), mo: next.getUTCMonth() + 1, d: next.getUTCDate() };
          })();
    return zonedTimeToUtc(
      etTz,
      closeDay.y,
      closeDay.mo,
      closeDay.d,
      Math.floor(closeMin / 60),
      closeMin % 60
    );
  };

  const openUtcToday = openUtcFor(etParts.year, etParts.month, etParts.day);
  const closeUtcToday = closeUtcForOpenUtc(openUtcToday);

  // If the full session already ended, move to tomorrow's ET date.
  if (now.getTime() >= closeUtcToday.getTime()) {
    const tomorrow = new Date(Date.UTC(etParts.year, etParts.month - 1, etParts.day) + 24 * 60 * 60 * 1000);
    const t = getZonedParts(tomorrow, etTz);
    const openUtc = openUtcFor(t.year, t.month, t.day);
    return { openUtc, closeUtc: closeUtcForOpenUtc(openUtc) };
  }

  return { openUtc: openUtcToday, closeUtc: closeUtcToday };
}

function applyFxEtOverride(status, market, now, timeFormat) {
  // Only affects FX view for the 4 FX hubs shown in common ET-based tables.
  if (hoursMode() !== 'fx') return status;
  // sessionKind is carried on the effectiveMarket() object, not the status payload.
  if (market?.sessionKind !== 'fx') return status;
  if (!FX_ET_BY_MARKET_ID[market.id]) return status;

  const next = nextEtOpenCloseUtc(market.id, now);
  if (!next) return status;

  const nowMs = now.getTime();
  const openMs = next.openUtc.getTime();
  const closeMs = next.closeUtc.getTime();
  const isOpen = nowMs >= openMs && nowMs < closeMs;

  const merged = { ...status };
  merged.isOpen = isOpen;
  merged.countdownMs = isOpen ? (closeMs - nowMs) : (openMs - nowMs);
  merged.countdownLabel = isOpen ? 'Closes in' : 'Opens in';

  // Ensure the "opens in" line uses the ET-anchored next open in user time.
  merged.next = { open: next.openUtc, close: next.closeUtc, session: { open: 'ET', close: 'ET' } };
  // Keep "local" as the market's own timezone label.
  merged.nextOpenLocal = formatLocalTime(next.openUtc, market.timezone, { timeFormat, includeSeconds: false });
  return merged;
}

/**
 * Pick session rows for the requested toggle. Non–forex-hub markets always use
 * stock-exchange hours; we never label those as a "Forex session".
 * @returns {{ sessions: object[], kind: 'fx'|'exchange' }}
 */
function resolveMarketSessions(market, requestedMode) {
  const map = market.sessionsByMode;
  if (map?.[requestedMode]?.length) {
    return { sessions: map[requestedMode], kind: requestedMode };
  }
  return { sessions: market.sessions || [], kind: 'exchange' };
}

function mainOpenForToast(marketId, mode, timeFormat) {
  const m = marketById(marketId);
  const map = m?.sessionsByMode;
  if (!map) return '';
  const sessions = map[mode];
  const main = sessions?.find((s) => s.countsAsOpen !== false);
  return main ? formatSessionTime(main.open, timeFormat) : '';
}

/** Sessions for open/closed logic — only data from markets.js, no synthetic windows. */
function effectiveMarket(market) {
  const requested = sessionMode(market);
  const { sessions, kind } = resolveMarketSessions(market, requested);
  return { ...market, sessions, sessionKind: kind };
}

function marketById(id) {
  return AVAILABLE_MARKETS.find((m) => m.id === id);
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

function marketHoursHeadline(market, kind) {
  return MARKET_MODE_LABELS[market.id]?.[kind]
    || (kind === 'fx' ? `Forex ${market.name} session` : `${market.name} stock exchange`);
}

const OPENS_IN_NAMES = {
  newyork: { fx: 'Forex NY', exchange: 'NYSE' },
  sydney: { fx: 'Forex Sydney', exchange: 'ASX' },
  tokyo: { fx: 'Forex Tokyo', exchange: 'JPX' },
  frankfurt: { fx: 'Forex Frankfurt', exchange: 'Xetra' },
  london: { fx: 'Forex London', exchange: 'LSE' },
  hongkong: { fx: 'Forex Hong Kong', exchange: 'HKEX' }
};

function opensInLabel(market) {
  const kind = effectiveMarket(market).sessionKind;
  return OPENS_IN_NAMES[market.id]?.[kind]
    || (kind === 'fx' ? 'Forex session' : 'Market');
}

function formatUserTime12(date, timeZone) {
  return formatLocalTime(date, timeZone, { timeFormat: '12h', includeSeconds: false });
}

function formatNextOpenDisplay(market, status, now) {
  const session = status.next?.session;
  if (!session) return status.nextOpenLocal || '—';
  const userTz = getUserTimezone();
  const userOpen = status.next?.open
    ? formatUserTime12(new Date(status.next.open), userTz)
    : formatSessionTimesInUserTz(market, session, now, '12h').open;
  const marketOpen = status.nextOpenLocal || formatSessionTime(session.open, '12h');
  const city = market.timezone.split('/').pop().replace(/_/g, ' ');
  return `${userOpen} your time · ${marketOpen} ${city}`;
}

function formatCountdownRow(market, status, now, timeFormat) {
  if (status.isOpen) {
    return {
      label: status.countdownLabel,
      value: status.countdownMs == null ? '—' : formatDuration(status.countdownMs)
    };
  }
  const name = opensInLabel(market);
  const openAt = formatNextOpenDisplay(market, status, now);
  const dur = status.countdownMs == null ? '—' : formatOpensIn(status.countdownMs);
  return {
    label: `${name} opens in`,
    value: dur === '—' ? openAt : `${dur} · ${openAt}`
  };
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

function sessionRange(s, timeFormat) {
  return `${formatSessionTime(s.open, timeFormat)}–${formatSessionTime(s.close, timeFormat)}`;
}

/** Session hours in the market's own timezone (not the user's Windows timezone). */
function describeHoursForCard(market, now, timeFormat) {
  const em = effectiveMarket(market);
  const sessions = ensurePreMarketSessions(em.sessions);
  const fxToggle = hoursMode() === 'fx';

  const main = sessions.filter((s) => s.countsAsOpen !== false);
  const mainSession = main[0];
  if (!mainSession) return '—';

  const range = sessionRange(mainSession, timeFormat);
  const name = (mainSession.name || '').trim();

  // In FX view, show the ET-anchored session in the USER timezone (matches common Iran tables).
  if (fxToggle && em.sessionKind === 'fx' && FOREX_HUB_IDS.has(market.id)) {
    const user = formatFxEtInUserTz(market.id, now, timeFormat);
    if (user?.open && user?.close) return `FX ${user.open}–${user.close} your time`;
  }

  // Keep this line short: show the primary session only (+ your time open hint).
  const { open } = formatSessionTimesInUserTz(market, mainSession, now, timeFormat);
  const yourTime = open ? ` · ${open}` : '';

  // If the user is in FX view but this market doesn't have FX sessions, avoid "Forex" labeling.
  const isStockFallback = fxToggle && em.sessionKind === 'exchange' && !FOREX_HUB_IDS.has(market.id);
  if (isStockFallback) {
    return `${name || 'Market'} ${range}${yourTime}`;
  }

  // For FX hubs / EXCH view, keep the recognizable session name if present.
  if (name && !/^fx$/i.test(name)) return `${name} ${range}${yourTime}`;
  return `${em.sessionKind === 'fx' ? 'FX' : 'Market'} ${range}${yourTime}`;
}

/**
 * Overlay live Finnhub market status when the user has connected a free API key.
 */
function applyApiOverride(status, market) {
  if (sessionMode(market) !== 'exchange') return status;
  if (!currentSettings?.useTradingHoursApi || !currentSettings?.tradingHoursApiKey) {
    return status;
  }
  if (!getFinnhubExchange(market)) return status;
  const live = apiStatusByMarketId.get(market.id);
  if (!live) return status;

  const merged = { ...status };
  const liveOpen = !!live.isOpen;
  merged.isOpen = liveOpen;
  if (!liveOpen && status.isPreMarket) merged.isPreMarket = true;
  merged.apiStatus = live;
  const reason = live.holiday || live.reason;
  if (reason) merged.apiReason = reason;
  if (!liveOpen && status.countdownMs != null) {
    merged.countdownMs = status.countdownMs;
    merged.countdownLabel = 'Opens in';
  }
  return merged;
}

function renderCard(market, now) {
  const timeFormat = currentSettings?.timeFormat || '24h';
  const m = effectiveMarket(market);
  const baseStatus = computeMarketStatus(m, now, { timeFormat });
  const status = applyApiOverride(applyFxEtOverride(baseStatus, m, now, timeFormat), m);
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
  card.querySelector('.local-time').textContent = status.localTime;
  card.querySelector('.local-day').textContent = `${status.localDay} · local`;

  const countdown = formatCountdownRow(market, status, now, timeFormat);
  card.querySelector('.countdown-label').textContent = countdown.label;
  card.querySelector('.countdown-value').textContent = countdown.value;

  const hoursEl = card.querySelector('.hours-range');
  if (hoursEl) hoursEl.textContent = describeHoursForCard(market, now, timeFormat);

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
  timeSwapBtn.dataset.format = mode;
  swapBadge.textContent = mode === 'exchange' ? 'EXCH' : 'FX';
  timeSwapBtn.title = 'Switch FX / EXCH';
  timeSwapBtn.setAttribute('aria-label', 'Switch FX / EXCH');
}

function showModeToast() {
  if (!formatToast) return;
  // Toast text follows the button (FX / EXCH), not the inverted session rows on cards.
  const view = hoursMode();
  const tf = currentSettings?.timeFormat || '24h';
  if (view === 'exchange') {
    formatToast.textContent =
      `ASX ${mainOpenForToast('sydney', 'exchange', tf)} · ` +
      `JPX ${mainOpenForToast('tokyo', 'exchange', tf)} (each market’s local time)`;
  } else {
    formatToast.textContent =
      `Forex session hours · Sydney ${mainOpenForToast('sydney', 'fx', tf)} · ` +
      `Tokyo ${mainOpenForToast('tokyo', 'fx', tf)} (each market’s local time)`;
  }
  formatToast.hidden = false;
  clearTimeout(formatToastTimer);
  formatToastTimer = setTimeout(() => {
    formatToast.hidden = true;
  }, 4500);
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
    const st = applyApiOverride(applyFxEtOverride(computeMarketStatus(em, now, { timeFormat }), em, now, timeFormat), em);
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
      .map((m) => {
        const em = effectiveMarket(m);
        return applyApiOverride(applyFxEtOverride(computeMarketStatus(em, now, { timeFormat }), em, now, timeFormat), em);
      })
      .filter((s) => s.next)
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
  if (apiEnabled && apiStatusByMarketId.size > 0) {
    dataSourceEl.textContent = 'Finnhub · live';
    dataSourceEl.style.color = '#86efac';
  } else if (apiEnabled && apiLastError) {
    dataSourceEl.textContent = 'Finnhub · offline';
    dataSourceEl.style.color = '#fca5a5';
  } else if (apiEnabled) {
    dataSourceEl.textContent = 'Finnhub · loading…';
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
    apiStatusByMarketId = new Map();
    clearRuntimeHolidays();
    apiLastError = null;
    return;
  }
  const token = currentSettings.tradingHoursApiKey;
  const apiMarkets = selectedMarkets.filter(m => getFinnhubExchange(m));
  if (!apiMarkets.length) {
    apiStatusByMarketId = new Map();
    clearRuntimeHolidays();
    apiLastError = null;
    return;
  }
  try {
    const [statusMap, holidayMap] = await Promise.all([
      fetchStatusForMarkets(token, apiMarkets),
      fetchHolidaysForMarkets(token, apiMarkets)
    ]);
    apiStatusByMarketId = statusMap;
    clearRuntimeHolidays();
    for (const [marketId, holidays] of holidayMap) {
      setRuntimeHolidays(marketId, holidays);
    }
    apiLastError = null;
  } catch (e) {
    apiLastError = e.message || String(e);
    console.warn('Finnhub API refresh failed:', apiLastError);
  }
  updateDataSourceLabel();
  tick();
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
  showModeToast();
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
