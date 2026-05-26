import { AVAILABLE_MARKETS } from '../lib/markets.js';
import { computeMarketStatus, countOpenMarkets } from '../lib/session.js';
import { getSettings, onChange } from '../lib/storage.js';

const ALARM_TICK = 'fx-tick';
const STORAGE_LAST_STATES = 'lastMarketStates';

function buildSelectedMarkets(settings) {
  const map = new Map();
  for (const m of AVAILABLE_MARKETS) map.set(m.id, m);
  for (const m of settings.customMarkets || []) map.set(m.id, m);
  return (settings.selectedMarketIds || [])
    .map(id => map.get(id))
    .filter(Boolean);
}

async function updateBadge() {
  try {
    const settings = await getSettings();
    const markets = buildSelectedMarkets(settings);
    if (!markets.length) {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Forex Market Hours' });
      return;
    }
    const open = countOpenMarkets(markets);
    if (open > 0) {
      await chrome.action.setBadgeText({ text: String(open) });
      await chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
      await chrome.action.setBadgeTextColor?.({ color: '#ffffff' });
    } else {
      await chrome.action.setBadgeText({ text: '•' });
      await chrome.action.setBadgeBackgroundColor({ color: '#475569' });
      await chrome.action.setBadgeTextColor?.({ color: '#ffffff' });
    }
    const lines = markets.map(m => {
      const s = computeMarketStatus(m);
      return `${m.name}: ${s.isOpen ? 'Open' : 'Closed'} (${s.localTime})`;
    });
    await chrome.action.setTitle({ title: lines.join('\n') });
  } catch (e) {
    console.warn('updateBadge failed', e);
  }
}

async function handleNotifications() {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;
  const markets = buildSelectedMarkets(settings);
  if (!markets.length) return;

  const stored = await chrome.storage.local.get([STORAGE_LAST_STATES]);
  const previous = stored[STORAGE_LAST_STATES] || {};
  const next = {};
  for (const m of markets) {
    const status = computeMarketStatus(m);
    next[m.id] = status.isOpen;
    if (previous[m.id] !== undefined && previous[m.id] !== status.isOpen) {
      const verb = status.isOpen ? 'opened' : 'closed';
      try {
        await chrome.notifications.create(`fx-${m.id}-${Date.now()}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: `${m.flag || ''} ${m.name} ${verb}`.trim(),
          message: status.isOpen
            ? `Closes in ${humanDuration(status.closesIn)} (local ${status.localTime}).`
            : `Next session opens at ${status.nextOpenLocal || '—'} local time.`,
          priority: 1
        });
      } catch (e) {
        console.warn('notification failed', e);
      }
    }
  }
  await chrome.storage.local.set({ [STORAGE_LAST_STATES]: next });
}

function humanDuration(ms) {
  if (ms == null || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function tick() {
  await updateBadge();
  await handleNotifications();
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await chrome.alarms.create(ALARM_TICK, { periodInMinutes: 0.5 });
  await tick();
  if (details.reason === 'install') {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('options/welcome.html')
      });
    } catch (e) {
      console.warn('Could not open welcome tab', e);
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(ALARM_TICK, { periodInMinutes: 0.5 });
  await tick();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_TICK) tick();
});

onChange(() => tick());

tick();
