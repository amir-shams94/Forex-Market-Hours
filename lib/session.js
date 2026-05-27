// Computes session status (open/closed), local time and countdown for a market.
// All math is done with Date.UTC + Intl.DateTimeFormat so DST is handled by
// the JavaScript engine automatically. Holiday & half-day calendars are
// applied on top via lib/holidays.js.

import { getHoliday } from './holidays.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Show "Pre-market" when the next regular session opens within this window. */
export const PRE_MARKET_APPROACH_MS = 60 * 60 * 1000;

/**
 * Parse "HH:MM" into total minutes.
 * @param {string} hhmm
 * @returns {number}
 */
function parseHHMM(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHMM(totalMin) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Ensure every market list has a Pre-market window before the first regular session.
 * Used for display + "about to open" state in both FX and Exchange modes.
 */
export function ensurePreMarketSessions(sessions) {
  if (!sessions?.length) return sessions;
  if (sessions.some((s) => s.countsAsOpen === false)) return sessions;
  const main = sessions.find((s) => s.countsAsOpen !== false) || sessions[0];
  const openMin = parseHHMM(main.open);
  const preOpenMin = Math.max(0, openMin - 60);
  const pre = {
    name: 'Pre-market',
    open: minutesToHHMM(preOpenMin),
    close: main.open,
    days: main.days,
    countsAsOpen: false
  };
  return [pre, ...sessions];
}

/** First regular (non pre-market) session open time as HH:MM. */
export function mainSessionOpenTime(sessions) {
  const main = sessions.find((s) => s.countsAsOpen !== false) || sessions[0];
  return main?.open || '';
}

/**
 * Get the parts of a Date as seen in a given IANA timezone.
 * @param {Date} date
 * @param {string} timeZone
 */
export function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short'
  });
  const parts = formatter.formatToParts(date);
  const out = {};
  for (const p of parts) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: out.hour === '24' ? 0 : Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: weekdayMap[out.weekday]
  };
}

/**
 * Convert a "wall clock" local date in a timezone (Y/M/D/H/M) to a UTC Date.
 * Uses an iterative approach to account for DST.
 * @param {string} timeZone
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day 1-31
 * @param {number} hour 0-23
 * @param {number} minute 0-59
 * @returns {Date}
 */
export function zonedTimeToUtc(timeZone, year, month, day, hour, minute) {
  // First approximation: treat the wall clock as if it were UTC.
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const parts = getZonedParts(new Date(utc), timeZone);
    const observed = Date.UTC(
      parts.year, parts.month - 1, parts.day,
      parts.hour, parts.minute, 0
    );
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = target - observed;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

/**
 * Format milliseconds as "Hh Mm" or "Mm Ss".
 * @param {number} ms
 */
export function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

/** Countdown until open — emphasizes hours (e.g. "13h 5m"). */
export function formatOpensIn(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 0) ms = 0;
  const totalMin = Math.ceil(ms / MINUTE);
  if (totalMin >= 24 * 60) return formatDuration(ms);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}

/**
 * Format a Date as local market time string "HH:MM:SS".
 * @param {Date} date
 * @param {string} timeZone
 */
export function formatLocalTime(date, timeZone, opts = {}) {
  const timeFormat = opts.timeFormat || '24h';
  const includeSeconds = opts.includeSeconds !== false;
  const hour12 = timeFormat === '12h';
  const locale = hour12 ? 'en-US' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour12,
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {})
  }).format(date);
}

/**
 * Format a session wall-clock time string "HH:MM" for display (e.g. "08:00" -> "8am").
 * @param {string} hhmm
 * @param {'24h'|'12h'} [timeFormat]
 */
export function formatSessionTime(hhmm, timeFormat = '24h') {
  if (!hhmm || typeof hhmm !== 'string') return '';
  if (timeFormat !== '12h') return hhmm;
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  if (m === 0) return `${h12}${suffix}`;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

/**
 * Format one session window for UI (e.g. "Early 3:30am–5am" or "3:30am–5am").
 * @param {{open:string, close:string, name?:string}} session
 * @param {'24h'|'12h'} [timeFormat]
 */
export function formatSessionWindow(session, timeFormat = '24h') {
  if (!session) return '';
  const range =
    `${formatSessionTime(session.open, timeFormat)}–${formatSessionTime(session.close, timeFormat)}`;
  return session.name ? `${session.name} ${range}` : range;
}

/** Short timezone label for a market (e.g. "EDT", "AEST"). */
export function formatMarketTimezoneLabel(timeZone, date = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' });
    const name = fmt.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value;
    if (name) return name;
  } catch {
    /* fall through */
  }
  const parts = timeZone.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

/** Browser / Windows timezone (e.g. Asia/Tehran). */
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Convert a session's open/close wall-clock (market TZ, today) into the user's timezone.
 */
export function formatSessionTimesInUserTz(market, session, now, timeFormat = '24h') {
  const userTz = getUserTimezone();
  const parts = getZonedParts(now, market.timezone);
  const openMin = parseHHMM(session.open);
  const closeMin = parseHHMM(session.close);
  const openUtc = zonedTimeToUtc(
    market.timezone, parts.year, parts.month, parts.day,
    Math.floor(openMin / 60), openMin % 60
  );
  let closeUtc;
  if (closeMin > openMin) {
    closeUtc = zonedTimeToUtc(
      market.timezone, parts.year, parts.month, parts.day,
      Math.floor(closeMin / 60), closeMin % 60
    );
  } else {
    const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + DAY);
    closeUtc = zonedTimeToUtc(
      market.timezone,
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate(),
      Math.floor(closeMin / 60),
      closeMin % 60
    );
  }
  return {
    open: formatLocalTime(openUtc, userTz, { timeFormat, includeSeconds: false }),
    close: formatLocalTime(closeUtc, userTz, { timeFormat, includeSeconds: false })
  };
}

/**
 * Format a Date's weekday + date string in a timezone.
 */
export function formatLocalDay(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Build an absolute UTC interval [openUTC, closeUTC) for a session on a given
 * local date in the market's timezone.
 * @param {object} market
 * @param {{open:string, close:string, days:number[]}} session
 * @param {number} year
 * @param {number} month
 * @param {number} day
 */
function sessionIntervalUtc(market, session, year, month, day) {
  const openMin = parseHHMM(session.open);
  const closeMin = parseHHMM(session.close);
  const openH = Math.floor(openMin / 60);
  const openM = openMin % 60;
  const closeH = Math.floor(closeMin / 60);
  const closeM = closeMin % 60;
  const openUtc = zonedTimeToUtc(market.timezone, year, month, day, openH, openM);
  let closeUtc;
  if (closeMin > openMin) {
    closeUtc = zonedTimeToUtc(market.timezone, year, month, day, closeH, closeM);
  } else {
    // Session that crosses midnight (e.g. 22:00 - 06:00). Roll to next day.
    const next = new Date(Date.UTC(year, month - 1, day) + DAY);
    closeUtc = zonedTimeToUtc(
      market.timezone,
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate(),
      closeH,
      closeM
    );
  }
  return { open: openUtc, close: closeUtc };
}

/**
 * Format a date as 'YYYY-MM-DD' in the given IANA timezone.
 */
function localDateString(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * Compute the full status for a market at the given moment.
 * @param {object} market
 * @param {Date} [now]
 */
export function computeMarketStatus(market, now = new Date(), opts = {}) {
  const timeFormat = opts.timeFormat || '24h';
  const localNow = getZonedParts(now, market.timezone);
  const todayUTC = Date.UTC(localNow.year, localNow.month - 1, localNow.day);

  // Scan a window from yesterday to 8 days in the future to find current/next session.
  // For each scanned day we apply the holiday calendar:
  //   - full-day closure  -> skip all sessions that day
  //   - half-day (closeAt) -> shrink the session(s) to end at the early close
  const intervals = [];
  const holidayByDate = new Map();
  for (let offset = -1; offset <= 8; offset++) {
    const d = new Date(todayUTC + offset * DAY);
    const parts = getZonedParts(d, market.timezone);
    const dateStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    const holiday = getHoliday(market, dateStr);
    if (holiday) holidayByDate.set(dateStr, holiday);
    if (holiday && !holiday.closeAt) continue;
    for (const session of market.sessions) {
      if (!session.days.includes(parts.weekday)) continue;
      let effectiveSession = session;
      if (holiday && holiday.closeAt) {
        if (holiday.closeAt <= session.open) continue;
        effectiveSession = { ...session, close: holiday.closeAt };
      }
      const interval = sessionIntervalUtc(
        market, effectiveSession, parts.year, parts.month, parts.day
      );
      intervals.push({ ...interval, session: effectiveSession, holiday: holiday || null });
    }
  }
  intervals.sort((a, b) => a.open - b.open);

  const nowMs = now.getTime();
  let currentTrading = null;
  let currentAny = null;
  let nextAny = null;
  let nextTrading = null;
  let previous = null;

  const sessionCountsAsOpen = (session) => session?.countsAsOpen !== false;

  for (const iv of intervals) {
    if (iv.open <= nowMs && nowMs < iv.close) {
      currentAny = iv;
      if (sessionCountsAsOpen(iv.session)) currentTrading = iv;
    } else if (iv.open > nowMs) {
      if (!nextAny) nextAny = iv;
      if (sessionCountsAsOpen(iv.session) && !nextTrading) nextTrading = iv;
    }
    if (iv.close <= nowMs) previous = iv;
  }
  if (!nextAny) nextAny = intervals.find(iv => iv.open > nowMs) || null;
  if (!nextTrading) nextTrading = intervals.find(iv => iv.open > nowMs && sessionCountsAsOpen(iv.session)) || null;

  const isOpen = !!currentTrading;
  let isPreMarket = !!(currentAny && !currentTrading && !sessionCountsAsOpen(currentAny.session));
  const displayInterval = currentTrading || currentAny;
  const closesIn = currentTrading ? currentTrading.close - nowMs : null;
  const opensIn = nextTrading ? nextTrading.open - nowMs : null;
  const countdownInterval = isOpen ? currentTrading : nextTrading;

  // Within 1h of the next regular open → Pre-market only when a pre-market window ends at that open
  // (avoids false "Pre-market" during lunch breaks, e.g. JPX AM → JPX PM).
  if (!isOpen && !isPreMarket && nextTrading && opensIn != null && opensIn > 0 && opensIn <= PRE_MARKET_APPROACH_MS) {
    const nextOpen = nextTrading.session.open;
    const hasPreWindow = market.sessions.some(
      (s) => s.countsAsOpen === false && s.close === nextOpen
    );
    if (hasPreWindow) isPreMarket = true;
  }

  const todayStr = localDateString(now, market.timezone);
  const todayHoliday = holidayByDate.get(todayStr) || null;
  const isHalfDay = !!(todayHoliday && todayHoliday.closeAt);
  const isFullHoliday = !!(todayHoliday && !todayHoliday.closeAt);

  return {
    market,
    now,
    isOpen,
    isPreMarket,
    localTime: formatLocalTime(now, market.timezone, { timeFormat }),
    localDay: formatLocalDay(now, market.timezone),
    weekday: localNow.weekday,
    current: displayInterval,
    tradingCurrent: currentTrading,
    next: countdownInterval,
    nextAny,
    previous,
    closesIn,
    opensIn,
    countdownMs: isOpen ? closesIn : opensIn,
    countdownLabel: isOpen ? 'Closes in' : 'Opens in',
    nextOpenLocal: countdownInterval
      ? formatLocalTime(countdownInterval.open, market.timezone, { timeFormat, includeSeconds: false })
      : null,
    nextOpenDay: countdownInterval ? formatLocalDay(countdownInterval.open, market.timezone) : null,
    nextCloseLocal: currentTrading
      ? formatLocalTime(currentTrading.close, market.timezone, { timeFormat, includeSeconds: false })
      : null,
    todayHoliday,
    isHalfDay,
    isFullHoliday
  };
}

/**
 * Returns the number of currently-open markets out of the provided list.
 * @param {object[]} markets
 * @param {Date} [now]
 */
export function countOpenMarkets(markets, now = new Date()) {
  return markets.reduce((acc, m) => acc + (computeMarketStatus(m, now).isOpen ? 1 : 0), 0);
}
