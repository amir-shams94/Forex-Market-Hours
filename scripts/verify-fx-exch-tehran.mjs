/**
 * Quick check: FX vs EXCH main open → Asia/Tehran (Iran).
 * Run: node scripts/verify-fx-exch-tehran.mjs
 */
import { AVAILABLE_MARKETS } from '../lib/markets.js';
import { getZonedParts, zonedTimeToUtc } from '../lib/session.js';

const USER_TZ = 'Asia/Tehran';
const MARKETS = ['sydney', 'tokyo', 'london', 'newyork'];

function parseHHMM(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatInTz(ms, tz, hour12 = true) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12
  }).format(new Date(ms));
}

function resolveSessions(m, mode) {
  if (m.sessionsByMode?.[mode]?.length) return m.sessionsByMode[mode];
  return m.sessions;
}

const now = new Date();
console.log('Now (Tehran):', formatInTz(now.getTime(), USER_TZ));
console.log('Now (UTC):', new Date().toISOString());
console.log('');

for (const mode of ['fx', 'exchange']) {
  console.log(`--- ${mode.toUpperCase()} ---`);
  for (const id of MARKETS) {
    const m = AVAILABLE_MARKETS.find((x) => x.id === id);
    const sessions = resolveSessions(m, mode);
    const main = sessions.find((s) => s.countsAsOpen !== false) || sessions[0];
    const lp = getZonedParts(now, m.timezone);
    const openMin = parseHHMM(main.open);
    const openUtc = zonedTimeToUtc(
      m.timezone,
      lp.year,
      lp.month,
      lp.day,
      Math.floor(openMin / 60),
      openMin % 60
    );
    const tehran = formatInTz(openUtc.getTime(), USER_TZ);
    const local = main.open;
    console.log(
      `${id.padEnd(9)} ${(main.name || mode).padEnd(8)} local ${local}  →  Tehran ${tehran}`
    );
  }
  console.log('');
}
