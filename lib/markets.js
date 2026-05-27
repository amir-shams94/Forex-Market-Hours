// Default Forex markets with their major session hours in local time.
// Hours follow widely-used Forex trading session conventions.
// Times are local to the market's IANA timezone.
// `finId` is optional legacy metadata (Finnhub uses market id → exchange mapping).
// `countryCode` is ISO 3166-1 alpha-2, used to render the country silhouette.

export const DEFAULT_MARKETS = [
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    flag: '\u{1F1E6}\u{1F1FA}',
    timezone: 'Australia/Sydney',
    finId: 'au.asx',
    // Two common references:
    // - fx:   Sydney FX session convention
    // - cash: ASX cash session
    sessionsByMode: {
      fx: [
        // Many Iran-focused FX session tables define Sydney from 18:00 ET,
        // which corresponds to 08:00 Sydney during US DST (→ 01:30 Tehran).
        { name: 'Pre-market', open: '07:00', close: '08:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'FX', open: '08:00', close: '16:00', days: [1, 2, 3, 4, 5] }
      ],
      exchange: [
        { name: 'Pre-market', open: '09:00', close: '10:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'ASX', open: '10:00', close: '16:00', days: [1, 2, 3, 4, 5] }
      ]
    },
    sessions: [{ name: 'FX', open: '08:00', close: '16:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    flag: '\u{1F1EF}\u{1F1F5}',
    timezone: 'Asia/Tokyo',
    finId: 'jp.jpx',
    // Two common references:
    // - fx:   Tokyo FX session convention
    // - cash: JPX cash market hours (split session)
    sessionsByMode: {
      fx: [
        // Many Iran-focused FX session tables define Tokyo from 19:00 ET,
        // which corresponds to 10:00 Tokyo during US DST (→ 03:30 Tehran).
        { name: 'Pre-market', open: '09:00', close: '10:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'FX', open: '10:00', close: '19:00', days: [1, 2, 3, 4, 5] }
      ],
      exchange: [
        { name: 'Pre-market', open: '08:00', close: '09:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'JPX AM', open: '09:00', close: '11:30', days: [1, 2, 3, 4, 5] },
        { name: 'JPX PM', open: '12:30', close: '15:30', days: [1, 2, 3, 4, 5] }
      ]
    },
    sessions: [{ name: 'FX', open: '10:00', close: '19:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'hongkong',
    name: 'Hong Kong',
    country: 'Hong Kong',
    countryCode: 'HK',
    flag: '\u{1F1ED}\u{1F1F0}',
    timezone: 'Asia/Hong_Kong',
    finId: 'hk.hkex',
    sessionsByMode: {
      fx: [
        { name: 'Pre-market', open: '08:30', close: '09:30', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'FX', open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] }
      ],
      exchange: [
        { name: 'Pre-market', open: '08:30', close: '09:30', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'HKEX', open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] }
      ]
    },
    sessions: [{ open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'frankfurt',
    name: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    flag: '\u{1F1E9}\u{1F1EA}',
    timezone: 'Europe/Berlin',
    finId: 'de.xetr',
    // Two common references:
    // - fx:   Frankfurt FX session convention
    // - cash: Xetra cash session
    sessionsByMode: {
      fx: [
        { name: 'Pre-market', open: '07:00', close: '08:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'FX', open: '08:00', close: '17:00', days: [1, 2, 3, 4, 5] }
      ],
      exchange: [
        { name: 'Pre-market', open: '08:00', close: '09:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'Xetra', open: '09:00', close: '17:30', days: [1, 2, 3, 4, 5] }
      ]
    },
    sessions: [{ name: 'FX', open: '08:00', close: '17:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    flag: '\u{1F1EC}\u{1F1E7}',
    timezone: 'Europe/London',
    finId: 'gb.lse',
    sessionsByMode: {
      fx: [
        { name: 'Pre-market', open: '07:00', close: '08:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'FX', open: '08:00', close: '17:00', days: [1, 2, 3, 4, 5] }
      ],
      exchange: [
        { name: 'Pre-market', open: '07:00', close: '08:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'LSE', open: '08:00', close: '16:30', days: [1, 2, 3, 4, 5] }
      ]
    },
    sessions: [{ name: 'FX', open: '08:00', close: '17:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'newyork',
    name: 'New York',
    country: 'United States',
    countryCode: 'US',
    flag: '\u{1F1FA}\u{1F1F8}',
    timezone: 'America/New_York',
    finId: 'us.nyse',
    // Two common references:
    // - fx:   New York FX session convention (08:00–17:00 ET)
    // - cash: NYSE cash market (09:30–16:00 ET)
    sessionsByMode: {
      // FX toggle: NY forex session 08:00 ET (≈ 3:30 PM Iran in summer)
      fx: [
        { name: 'Pre-market', open: '07:00', close: '08:00', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'FX', open: '08:00', close: '17:00', days: [1, 2, 3, 4, 5] }
      ],
      // EXCH toggle: NYSE 09:30 ET (≈ 5:00 PM Iran in summer)
      exchange: [
        { name: 'Pre-market', open: '04:00', close: '09:30', days: [1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'NYSE', open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] }
      ]
    },
    sessions: [{ name: 'FX', open: '08:00', close: '17:00', days: [1, 2, 3, 4, 5] }]
  }
];

export const AVAILABLE_MARKETS = [
  ...DEFAULT_MARKETS,
  {
    id: 'blackbull-gold',
    name: 'BlackBull · Gold (XAUUSD)',
    country: 'Broker hours (reference)',
    countryCode: 'IR',
    flag: '\u{1F947}',
    timezone: 'Asia/Tehran',
    // This is meant to mirror what the user sees on BlackBull charts:
    // daily open at 01:30 Tehran time (with an overnight break).
    sessionsByMode: {
      fx: [
        { name: 'Pre-market', open: '00:30', close: '01:30', days: [0, 1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'XAUUSD', open: '01:30', close: '23:59', days: [0, 1, 2, 3, 4, 5] }
      ],
      exchange: [
        { name: 'Pre-market', open: '00:30', close: '01:30', days: [0, 1, 2, 3, 4, 5], countsAsOpen: false },
        { name: 'XAUUSD', open: '01:30', close: '23:59', days: [0, 1, 2, 3, 4, 5] }
      ]
    },
    sessions: [{ name: 'XAUUSD', open: '01:30', close: '23:59', days: [0, 1, 2, 3, 4, 5] }]
  },
  {
    id: 'wellington',
    name: 'Wellington',
    country: 'New Zealand',
    countryCode: 'NZ',
    flag: '\u{1F1F3}\u{1F1FF}',
    timezone: 'Pacific/Auckland',
    finId: 'nz.nzx',
    sessions: [{ open: '10:00', close: '16:45', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    flag: '\u{1F1F8}\u{1F1EC}',
    timezone: 'Asia/Singapore',
    finId: 'sg.sgx',
    sessions: [{ open: '09:00', close: '17:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    country: 'China',
    countryCode: 'CN',
    flag: '\u{1F1E8}\u{1F1F3}',
    timezone: 'Asia/Shanghai',
    finId: 'cn.sse',
    sessions: [
      { open: '09:30', close: '11:30', days: [1, 2, 3, 4, 5] },
      { open: '13:00', close: '15:00', days: [1, 2, 3, 4, 5] }
    ]
  },
  {
    id: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    flag: '\u{1F1F0}\u{1F1F7}',
    timezone: 'Asia/Seoul',
    finId: 'kr.krx',
    sessions: [{ open: '09:00', close: '15:30', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    flag: '\u{1F1EE}\u{1F1F3}',
    timezone: 'Asia/Kolkata',
    finId: 'in.nse',
    sessions: [{ open: '09:15', close: '15:30', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    flag: '\u{1F1E6}\u{1F1EA}',
    timezone: 'Asia/Dubai',
    finId: 'ae.dfm',
    sessions: [{ open: '10:00', close: '15:00', days: [0, 1, 2, 3, 4] }]
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Türkiye',
    countryCode: 'TR',
    flag: '\u{1F1F9}\u{1F1F7}',
    timezone: 'Europe/Istanbul',
    finId: 'tr.bist',
    sessions: [{ open: '10:00', close: '18:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'zurich',
    name: 'Zurich',
    country: 'Switzerland',
    countryCode: 'CH',
    flag: '\u{1F1E8}\u{1F1ED}',
    timezone: 'Europe/Zurich',
    finId: 'ch.six',
    sessions: [{ open: '09:00', close: '17:30', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    flag: '\u{1F1EB}\u{1F1F7}',
    timezone: 'Europe/Paris',
    finId: 'fr.xpar',
    sessions: [{ open: '09:00', close: '17:30', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'milan',
    name: 'Milan',
    country: 'Italy',
    countryCode: 'IT',
    flag: '\u{1F1EE}\u{1F1F9}',
    timezone: 'Europe/Rome',
    finId: 'it.borsa',
    sessions: [{ open: '09:00', close: '17:30', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    flag: '\u{1F1EA}\u{1F1F8}',
    timezone: 'Europe/Madrid',
    finId: 'es.bme',
    sessions: [{ open: '09:00', close: '17:30', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    flag: '\u{1F1E8}\u{1F1E6}',
    timezone: 'America/Toronto',
    finId: 'ca.tsx',
    sessions: [{ open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'mexicocity',
    name: 'Mexico City',
    country: 'Mexico',
    countryCode: 'MX',
    flag: '\u{1F1F2}\u{1F1FD}',
    timezone: 'America/Mexico_City',
    finId: 'mx.bmv',
    sessions: [{ open: '08:30', close: '15:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'saopaulo',
    name: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    flag: '\u{1F1E7}\u{1F1F7}',
    timezone: 'America/Sao_Paulo',
    finId: 'br.bovespa',
    sessions: [{ open: '10:00', close: '17:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'johannesburg',
    name: 'Johannesburg',
    country: 'South Africa',
    countryCode: 'ZA',
    flag: '\u{1F1FF}\u{1F1E6}',
    timezone: 'Africa/Johannesburg',
    finId: 'za.jse',
    sessions: [{ open: '09:00', close: '17:00', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'moscow',
    name: 'Moscow',
    country: 'Russia',
    countryCode: 'RU',
    flag: '\u{1F1F7}\u{1F1FA}',
    timezone: 'Europe/Moscow',
    finId: 'ru.micex',
    sessions: [{ open: '10:00', close: '18:45', days: [1, 2, 3, 4, 5] }]
  },
  {
    id: 'jakarta',
    name: 'Jakarta',
    country: 'Indonesia',
    countryCode: 'ID',
    flag: '\u{1F1EE}\u{1F1E9}',
    timezone: 'Asia/Jakarta',
    finId: 'id.idx',
    sessions: [{ open: '09:00', close: '15:15', days: [1, 2, 3, 4, 5] }]
  }
];

export const DEFAULT_SELECTED_IDS = ['sydney', 'tokyo', 'london', 'newyork'];
