// Lightweight client for the public tradinghours.com REST API (v3).
// Authentication: Bearer token via `Authorization` header.
// Docs: https://docs.tradinghours.com/3.x/api-details
//
// This file is intentionally framework-free so it can be loaded directly by
// both the popup and the background service worker.

const BASE_URL = 'https://api.tradinghours.com/v3';
const CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map();

function authHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json'
  };
}

async function cachedFetch(url, apiKey) {
  const cached = memoryCache.get(url);
  if (cached && (Date.now() - cached.t) < CACHE_TTL_MS) {
    return cached.data;
  }
  const res = await fetch(url, { headers: authHeaders(apiKey) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TradingHours API ${res.status}: ${body || res.statusText}`);
  }
  const data = await res.json();
  memoryCache.set(url, { data, t: Date.now() });
  return data;
}

/**
 * Validate an API key by making a small request.
 * @param {string} apiKey
 */
export async function validateApiKey(apiKey) {
  if (!apiKey) return { ok: false, error: 'Missing API key' };
  try {
    await cachedFetch(`${BASE_URL}/markets?group=allowed`, apiKey);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * List all markets allowed by the API key.
 * @param {string} apiKey
 */
export async function listMarkets(apiKey) {
  const json = await cachedFetch(`${BASE_URL}/markets?group=allowed`, apiKey);
  return json?.data ?? [];
}

/**
 * Get live market status for one or more FinIDs.
 * @param {string} apiKey
 * @param {string[]} finIds
 */
export async function getMarketStatus(apiKey, finIds) {
  if (!finIds?.length) return [];
  const ids = finIds.join(',');
  const json = await cachedFetch(
    `${BASE_URL}/markets/status?fin_id=${encodeURIComponent(ids)}`,
    apiKey
  );
  return json?.data ?? [];
}

/**
 * Get market details for one or more FinIDs.
 */
export async function getMarketDetails(apiKey, finIds) {
  if (!finIds?.length) return [];
  const ids = finIds.join(',');
  const json = await cachedFetch(
    `${BASE_URL}/markets/details?fin_id=${encodeURIComponent(ids)}`,
    apiKey
  );
  return json?.data ?? [];
}

export function clearCache() {
  memoryCache.clear();
}
