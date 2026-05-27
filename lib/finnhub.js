// Finnhub free tier: market status + exchange holidays
// Register: https://finnhub.io/register
// Docs: https://finnhub.io/docs/api

const BASE_URL = 'https://finnhub.io/api/v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map();

/** Finnhub `exchange` query codes (see /stock/market-holiday). */
export const FINNHUB_EXCHANGE_BY_MARKET_ID = {
  newyork: 'US',
  toronto: 'TO',
  mexicocity: 'MX',
  saopaulo: 'SA',
  london: 'L',
  paris: 'PA',
  milan: 'MI',
  madrid: 'MC',
  frankfurt: 'DE',
  zurich: 'SW',
  istanbul: 'IS',
  johannesburg: 'JO',
  moscow: 'MCX',
  dubai: 'DU',
  mumbai: 'NS',
  sydney: 'AU',
  wellington: 'NZ',
  tokyo: 'T',
  hongkong: 'HK',
  shanghai: 'SS',
  seoul: 'KS',
  singapore: 'SG',
  jakarta: 'JK'
};

export function getFinnhubExchange(market) {
  if (!market?.id) return null;
  return FINNHUB_EXCHANGE_BY_MARKET_ID[market.id] || null;
}

async function cachedFetch(path, token) {
  const url = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  const cached = memoryCache.get(url);
  if (cached && Date.now() - cached.t < CACHE_TTL_MS) return cached.data;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Finnhub API ${res.status}: ${body || res.statusText}`);
  }
  const data = await res.json();
  memoryCache.set(url, { data, t: Date.now() });
  return data;
}

/**
 * @param {string} token
 */
export async function validateApiKey(token) {
  if (!token) return { ok: false, error: 'Missing API key' };
  try {
    await cachedFetch('/stock/market-status?exchange=US', token);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

/**
 * @param {string} token
 * @param {string} exchange
 */
export async function fetchMarketStatus(token, exchange) {
  const json = await cachedFetch(`/stock/market-status?exchange=${encodeURIComponent(exchange)}`, token);
  return {
    exchange: json.exchange || exchange,
    isOpen: !!json.isOpen,
    session: json.session || null,
    holiday: json.holiday || null,
    timezone: json.timezone || null,
    status: json.isOpen ? 'open' : 'closed',
    reason: json.holiday || null
  };
}

/**
 * Parse Finnhub holiday list into local holiday entries.
 * @param {object} payload
 * @returns {{date:string, name:string, closeAt?:string}[]}
 */
export function parseMarketHolidays(payload) {
  const rows = payload?.data;
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    const date = String(row.atDate || '').slice(0, 10);
    if (!date) continue;
    const name = row.eventName || 'Holiday';
    const th = String(row.tradingHour || '').trim();
    if (!th) {
      out.push({ date, name });
      continue;
    }
    const closeAt = parsePartialTradingHour(th);
    if (closeAt) out.push({ date, name, closeAt });
    else out.push({ date, name });
  }
  return out;
}

/** e.g. "09:30-13:00" or "0930-1300" → early close at 13:00 */
function parsePartialTradingHour(tradingHour) {
  const m = tradingHour.match(/(\d{1,2}):?(\d{2})\s*[-–]\s*(\d{1,2}):?(\d{2})/);
  if (!m) return null;
  const closeH = m[3].padStart(2, '0');
  const closeM = m[4].padStart(2, '0');
  return `${closeH}:${closeM}`;
}

/**
 * @param {string} token
 * @param {string} exchange
 */
export async function fetchMarketHolidays(token, exchange) {
  const json = await cachedFetch(`/stock/market-holiday?exchange=${encodeURIComponent(exchange)}`, token);
  return parseMarketHolidays(json);
}

/**
 * Live status for selected markets (one Finnhub exchange may cover several of our cards).
 * @param {string} token
 * @param {object[]} markets
 * @returns {Promise<Map<string, object>>} marketId → status payload
 */
export async function fetchStatusForMarkets(token, markets) {
  const byExchange = new Map();
  for (const m of markets) {
    const ex = getFinnhubExchange(m);
    if (!ex) continue;
    if (!byExchange.has(ex)) byExchange.set(ex, []);
    byExchange.get(ex).push(m);
  }

  const result = new Map();
  for (const [exchange, list] of byExchange) {
    try {
      const status = await fetchMarketStatus(token, exchange);
      for (const m of list) {
        result.set(m.id, { ...status, marketId: m.id, finnhubExchange: exchange });
      }
    } catch (e) {
      console.warn(`Finnhub status failed for ${exchange}:`, e);
    }
  }
  return result;
}

/**
 * Holidays per market id from Finnhub (by exchange).
 * @param {string} token
 * @param {object[]} markets
 * @returns {Promise<Map<string, {date:string, name:string, closeAt?:string}[]>>}
 */
export async function fetchHolidaysForMarkets(token, markets) {
  const byExchange = new Map();
  for (const m of markets) {
    const ex = getFinnhubExchange(m);
    if (!ex) continue;
    if (!byExchange.has(ex)) byExchange.set(ex, []);
    byExchange.get(ex).push(m);
  }

  const result = new Map();
  for (const [exchange, list] of byExchange) {
    try {
      const holidays = await fetchMarketHolidays(token, exchange);
      for (const m of list) {
        result.set(m.id, holidays);
      }
    } catch (e) {
      console.warn(`Finnhub holidays failed for ${exchange}:`, e);
    }
  }
  return result;
}

export function clearCache() {
  memoryCache.clear();
}
