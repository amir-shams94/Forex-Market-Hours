import { AVAILABLE_MARKETS } from '../lib/markets.js';
import { renderCountryMap } from '../lib/country-maps.js';
import { getSettings, updateSettings } from '../lib/storage.js';
import { validateApiKey } from '../lib/tradinghours.js';
import { formatSessionWindow } from '../lib/session.js';

const marketListEl = document.getElementById('market-list');
const customListEl = document.getElementById('custom-markets');
const marketRowTpl = document.getElementById('market-row-tpl');
const customRowTpl = document.getElementById('custom-row-tpl');
const customForm = document.getElementById('custom-form');
const customError = document.getElementById('custom-error');
const apiKeyEl = document.getElementById('api-key');
const useApiEl = document.getElementById('use-api');
const apiStatusEl = document.getElementById('api-status');
const testApiBtn = document.getElementById('test-api');
const notificationsEl = document.getElementById('notifications');
const saveIndicator = document.getElementById('save-indicator');
const simInput = document.getElementById('sim-input');
const simClearBtn = document.getElementById('sim-clear');
const simStatusEl = document.getElementById('sim-status');
const presetBtns = document.querySelectorAll('.preset-btn');

let settings = null;

function describeHours(market) {
  const timeFormat = settings?.timeFormat || '24h';
  return market.sessions
    .map(s => formatSessionWindow(s, timeFormat))
    .join(' · ');
}

function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function renderMarketList() {
  marketListEl.innerHTML = '';
  const customById = new Map((settings.customMarkets || []).map(m => [m.id, m]));
  const all = [
    ...AVAILABLE_MARKETS,
    ...(settings.customMarkets || []).filter(m =>
      !AVAILABLE_MARKETS.find(x => x.id === m.id)
    )
  ];
  for (const market of all) {
    const fragment = marketRowTpl.content.cloneNode(true);
    const row = fragment.querySelector('.market-row');
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.checked = settings.selectedMarketIds?.includes(market.id) ?? false;
    checkbox.addEventListener('change', () => {
      const set = new Set(settings.selectedMarketIds || []);
      if (checkbox.checked) set.add(market.id);
      else set.delete(market.id);
      patch({ selectedMarketIds: [...set] });
    });
    row.querySelector('.flag').textContent = market.flag || '🏳️';
    row.querySelector('.name').textContent = market.name +
      (customById.has(market.id) ? ' · custom' : '');
    row.querySelector('.tz').textContent = market.timezone;
    row.querySelector('.hours').textContent = describeHours(market);
    marketListEl.appendChild(row);
    renderCountryMap(row.querySelector('.map-thumb'), market.countryCode);
  }
}

function renderCustomMarkets() {
  customListEl.innerHTML = '';
  const list = settings.customMarkets || [];
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.style.margin = '0';
    p.style.fontSize = '12px';
    p.textContent = 'No custom markets yet.';
    customListEl.appendChild(p);
    return;
  }
  for (const market of list) {
    const fragment = customRowTpl.content.cloneNode(true);
    const row = fragment.querySelector('.custom-row');
    row.querySelector('.flag').textContent = market.flag || '🏳️';
    row.querySelector('.name').textContent = market.name;
    row.querySelector('.tz').textContent = market.timezone;
    row.querySelector('.hours').textContent = describeHours(market);
    row.querySelector('.danger').addEventListener('click', () => {
      const customMarkets = (settings.customMarkets || []).filter(m => m.id !== market.id);
      const selectedMarketIds = (settings.selectedMarketIds || [])
        .filter(id => id !== market.id);
      patch({ customMarkets, selectedMarketIds });
    });
    customListEl.appendChild(row);
    renderCountryMap(row.querySelector('.map-thumb'), market.countryCode);
  }
}

function flashSaved() {
  saveIndicator.textContent = 'Saved.';
  saveIndicator.classList.remove('muted');
  setTimeout(() => {
    saveIndicator.textContent = 'All changes are saved automatically.';
    saveIndicator.classList.add('muted');
  }, 1200);
}

async function patch(p) {
  settings = { ...settings, ...p };
  await updateSettings(p);
  renderMarketList();
  renderCustomMarkets();
  flashSaved();
}

customForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  customError.textContent = '';
  const formData = new FormData(customForm);
  const name = (formData.get('name') || '').toString().trim();
  const flag = (formData.get('flag') || '').toString().trim();
  const countryCode = (formData.get('countryCode') || '').toString().trim().toUpperCase();
  const timezone = (formData.get('timezone') || '').toString().trim();
  const open = (formData.get('open') || '').toString();
  const close = (formData.get('close') || '').toString();
  const finId = (formData.get('finId') || '').toString().trim();
  const days = formData.getAll('day').map(Number);
  if (!name || !timezone) {
    customError.textContent = 'Name and timezone are required.';
    return;
  }
  if (!isValidTimeZone(timezone)) {
    customError.textContent = `"${timezone}" is not a valid IANA timezone.`;
    return;
  }
  if (!days.length) {
    customError.textContent = 'Pick at least one trading day.';
    return;
  }
  const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
  const market = {
    id,
    name,
    flag: flag || '🏳️',
    countryCode: countryCode || undefined,
    timezone,
    finId: finId || undefined,
    sessions: [{ open, close, days }],
    custom: true
  };
  const customMarkets = [...(settings.customMarkets || []), market];
  const selectedMarketIds = [...(settings.selectedMarketIds || []), id];
  await patch({ customMarkets, selectedMarketIds });
  customForm.reset();
  customForm.querySelector('[name="open"]').value = '09:00';
  customForm.querySelector('[name="close"]').value = '17:00';
});

apiKeyEl.addEventListener('input', () => {
  const value = apiKeyEl.value.trim();
  patch({ tradingHoursApiKey: value });
  apiStatusEl.textContent = value ? 'Key set. Click Test to verify.' : 'Not connected.';
  apiStatusEl.classList.remove('ok', 'err');
});

useApiEl.addEventListener('change', () => {
  patch({ useTradingHoursApi: useApiEl.checked });
});

notificationsEl.addEventListener('change', async () => {
  if (notificationsEl.checked && chrome.notifications?.getPermissionLevel) {
    chrome.notifications.getPermissionLevel((level) => {
      if (level !== 'granted') {
        apiStatusEl.textContent = 'Allow notifications for this extension in Chrome settings.';
      }
    });
  }
  patch({ notificationsEnabled: notificationsEl.checked });
});

testApiBtn.addEventListener('click', async () => {
  const key = apiKeyEl.value.trim();
  if (!key) {
    apiStatusEl.textContent = 'Enter an API key first.';
    apiStatusEl.classList.add('err');
    return;
  }
  testApiBtn.disabled = true;
  testApiBtn.textContent = 'Testing…';
  apiStatusEl.classList.remove('ok', 'err');
  apiStatusEl.textContent = 'Validating API key…';
  const result = await validateApiKey(key);
  testApiBtn.disabled = false;
  testApiBtn.textContent = 'Test';
  if (result.ok) {
    apiStatusEl.textContent = 'Connected to TradingHours.com.';
    apiStatusEl.classList.add('ok');
  } else {
    apiStatusEl.textContent = `Connection failed: ${result.error}`;
    apiStatusEl.classList.add('err');
  }
});

/**
 * Convert a Date instance to the value format expected by <input type="datetime-local">,
 * i.e. "YYYY-MM-DDTHH:MM" in the BROWSER'S local timezone.
 */
function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    '-', pad(date.getMonth() + 1),
    '-', pad(date.getDate()),
    'T', pad(date.getHours()),
    ':', pad(date.getMinutes())
  ].join('');
}

function refreshSimStatus() {
  const v = settings.simulatedTime;
  if (!v) {
    simStatusEl.textContent = 'Currently using real time.';
    simStatusEl.classList.remove('ok', 'err');
    simInput.value = '';
    return;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    simStatusEl.textContent = 'Invalid stored value, ignored.';
    simStatusEl.classList.add('err');
    return;
  }
  const fmt = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  simStatusEl.textContent = `Time-travel active: ${fmt.format(d)}`;
  simStatusEl.classList.add('ok');
  simStatusEl.classList.remove('err');
  simInput.value = toLocalInputValue(d);
}

simInput.addEventListener('change', () => {
  const v = simInput.value;
  patch({ simulatedTime: v || null });
  refreshSimStatus();
});

simClearBtn.addEventListener('click', () => {
  simInput.value = '';
  patch({ simulatedTime: null });
  refreshSimStatus();
});

presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    let target;
    if (btn.dataset.presetOffset) {
      const days = parseInt(btn.dataset.presetOffset, 10);
      target = new Date();
      target.setDate(target.getDate() + days);
      target.setMinutes(0, 0, 0);
    } else if (btn.dataset.presetDate) {
      target = new Date(btn.dataset.presetDate);
    }
    if (!target || Number.isNaN(target.getTime())) return;
    const v = toLocalInputValue(target);
    simInput.value = v;
    patch({ simulatedTime: v });
    refreshSimStatus();
  });
});

async function init() {
  settings = await getSettings();
  apiKeyEl.value = settings.tradingHoursApiKey || '';
  useApiEl.checked = !!settings.useTradingHoursApi;
  notificationsEl.checked = !!settings.notificationsEnabled;
  if (settings.tradingHoursApiKey) {
    apiStatusEl.textContent = 'Key set. Click Test to verify.';
  }
  renderMarketList();
  renderCustomMarkets();
  refreshSimStatus();
}

init();
