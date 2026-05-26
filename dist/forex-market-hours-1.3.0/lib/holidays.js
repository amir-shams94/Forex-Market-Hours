// Curated holiday & half-day schedules for the markets in the catalogue.
// Sources: official exchange calendars (NYSE, LSE, Xetra, JPX, ASX, HKEX, SGX,
// SSE, KRX, NSE, ADX, BIST, SIX, Euronext Paris/Milan/Madrid, TSX, BMV, B3, JSE,
// MOEX, IDX, NZX) for 2026.
//
// Schema (per market id, matching markets.js):
//   { date: 'YYYY-MM-DD', name: '...', closeAt?: 'HH:MM' }
//
// - `date` is in the market's LOCAL timezone.
// - If `closeAt` is set, it's a half-day with an early close at that local time.
// - If `closeAt` is absent, the market is closed all day for that holiday.
//
// To keep the file maintainable we ship 2026 only. The local engine still
// works without a holiday entry (it falls back to standard hours).
// For full year-round, holiday-aware data including future years, connect
// the tradinghours.com API key in Settings.

export const HOLIDAYS = {
  // ---- North America ----
  newyork: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-19', name: 'Martin Luther King Jr. Day' },
    { date: '2026-02-16', name: "Presidents' Day" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-25', name: 'Memorial Day' },
    { date: '2026-06-19', name: 'Juneteenth' },
    { date: '2026-07-03', name: 'Independence Day (observed)' },
    { date: '2026-09-07', name: 'Labor Day' },
    { date: '2026-11-26', name: 'Thanksgiving Day' },
    { date: '2026-11-27', name: 'Day after Thanksgiving', closeAt: '13:00' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '13:00' },
    { date: '2026-12-25', name: 'Christmas Day' }
  ],
  toronto: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-16', name: 'Family Day' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-18', name: 'Victoria Day' },
    { date: '2026-07-01', name: 'Canada Day' },
    { date: '2026-08-03', name: 'Civic Holiday' },
    { date: '2026-09-07', name: 'Labour Day' },
    { date: '2026-10-12', name: 'Thanksgiving' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '13:00' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-28', name: 'Boxing Day (observed)' }
  ],
  mexicocity: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-02', name: 'Constitution Day' },
    { date: '2026-03-16', name: "Benito Juárez's Birthday" },
    { date: '2026-04-02', name: 'Maundy Thursday' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-01', name: 'Labor Day' },
    { date: '2026-09-16', name: 'Independence Day' },
    { date: '2026-11-02', name: 'Day of the Dead' },
    { date: '2026-11-16', name: 'Revolution Day (observed)' },
    { date: '2026-12-12', name: 'Day of the Virgin of Guadalupe' },
    { date: '2026-12-25', name: 'Christmas Day' }
  ],
  saopaulo: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-16', name: 'Carnival Monday' },
    { date: '2026-02-17', name: 'Carnival Tuesday' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-21', name: 'Tiradentes Day' },
    { date: '2026-05-01', name: 'Labor Day' },
    { date: '2026-06-04', name: 'Corpus Christi' },
    { date: '2026-09-07', name: 'Independence Day' },
    { date: '2026-10-12', name: 'Our Lady of Aparecida' },
    { date: '2026-11-02', name: "All Souls' Day" },
    { date: '2026-11-15', name: 'Republic Proclamation Day' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-31', name: "New Year's Eve" }
  ],

  // ---- Europe / Middle East / Africa ----
  london: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-04', name: 'Early May Bank Holiday' },
    { date: '2026-05-25', name: 'Spring Bank Holiday' },
    { date: '2026-08-31', name: 'Summer Bank Holiday' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '12:30' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-28', name: 'Boxing Day (observed)' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '12:30' }
  ],
  frankfurt: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '14:00' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '14:00' }
  ],
  paris: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '14:05' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '14:05' }
  ],
  milan: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-08-15', name: 'Assumption' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '14:05' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '14:05' }
  ],
  madrid: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-06', name: 'Epiphany' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '14:00' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '14:00' }
  ],
  zurich: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-02', name: "St. Berchtold's Day" },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-14', name: 'Ascension Day' },
    { date: '2026-05-25', name: 'Whit Monday' },
    { date: '2026-08-01', name: 'Swiss National Day' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '14:00' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '14:00' }
  ],
  istanbul: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-03-20', name: 'Eid al-Fitr Eve' },
    { date: '2026-03-21', name: 'Eid al-Fitr' },
    { date: '2026-03-22', name: 'Eid al-Fitr' },
    { date: '2026-03-23', name: 'Eid al-Fitr' },
    { date: '2026-04-23', name: "National Sovereignty Day" },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-19', name: 'Commemoration of Atatürk' },
    { date: '2026-05-27', name: 'Eid al-Adha Eve' },
    { date: '2026-05-28', name: 'Eid al-Adha' },
    { date: '2026-05-29', name: 'Eid al-Adha' },
    { date: '2026-05-30', name: 'Eid al-Adha' },
    { date: '2026-05-31', name: 'Eid al-Adha' },
    { date: '2026-07-15', name: 'Democracy Day' },
    { date: '2026-08-30', name: 'Victory Day' },
    { date: '2026-10-29', name: 'Republic Day' }
  ],
  moscow: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-02', name: 'New Year Holiday' },
    { date: '2026-01-05', name: 'New Year Holiday' },
    { date: '2026-01-06', name: 'New Year Holiday' },
    { date: '2026-01-07', name: 'Orthodox Christmas' },
    { date: '2026-01-08', name: 'New Year Holiday' },
    { date: '2026-02-23', name: 'Defender of the Fatherland Day' },
    { date: '2026-03-09', name: "International Women's Day (observed)" },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-11', name: 'Victory Day (observed)' },
    { date: '2026-06-12', name: 'Russia Day' },
    { date: '2026-11-04', name: 'Unity Day' }
  ],
  dubai: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-03-21', name: 'Eid al-Fitr' },
    { date: '2026-03-22', name: 'Eid al-Fitr' },
    { date: '2026-03-23', name: 'Eid al-Fitr' },
    { date: '2026-05-28', name: 'Eid al-Adha' },
    { date: '2026-05-29', name: 'Eid al-Adha' },
    { date: '2026-05-30', name: 'Eid al-Adha' },
    { date: '2026-06-17', name: 'Islamic New Year' },
    { date: '2026-08-26', name: "Prophet's Birthday" },
    { date: '2026-12-01', name: 'Commemoration Day' },
    { date: '2026-12-02', name: 'National Day' },
    { date: '2026-12-03', name: 'National Day Holiday' }
  ],
  johannesburg: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-03-21', name: 'Human Rights Day' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Family Day' },
    { date: '2026-04-27', name: 'Freedom Day' },
    { date: '2026-05-01', name: 'Workers Day' },
    { date: '2026-06-16', name: 'Youth Day' },
    { date: '2026-08-10', name: "National Women's Day (observed)" },
    { date: '2026-09-24', name: 'Heritage Day' },
    { date: '2026-12-16', name: 'Day of Reconciliation' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-28', name: 'Day of Goodwill (observed)' }
  ],

  // ---- Asia-Pacific ----
  tokyo: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-02', name: 'Bank Holiday' },
    { date: '2026-01-03', name: 'Bank Holiday' },
    { date: '2026-01-12', name: 'Coming of Age Day' },
    { date: '2026-02-11', name: 'National Foundation Day' },
    { date: '2026-02-23', name: "Emperor's Birthday" },
    { date: '2026-03-20', name: 'Vernal Equinox Day' },
    { date: '2026-04-29', name: 'Showa Day' },
    { date: '2026-05-04', name: 'Greenery Day' },
    { date: '2026-05-05', name: "Children's Day" },
    { date: '2026-05-06', name: 'Constitution Day (observed)' },
    { date: '2026-07-20', name: 'Marine Day' },
    { date: '2026-08-11', name: 'Mountain Day' },
    { date: '2026-09-21', name: 'Respect for the Aged Day' },
    { date: '2026-09-23', name: 'Autumnal Equinox Day' },
    { date: '2026-10-12', name: 'Sports Day' },
    { date: '2026-11-03', name: 'Culture Day' },
    { date: '2026-11-23', name: 'Labor Thanksgiving Day' },
    { date: '2026-12-31', name: "New Year's Eve" }
  ],
  hongkong: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-17', name: 'Lunar New Year Day 1' },
    { date: '2026-02-18', name: 'Lunar New Year Day 2' },
    { date: '2026-02-19', name: 'Lunar New Year Day 3' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-04', name: 'Day after Good Friday', closeAt: '12:00' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-04-07', name: 'Ching Ming Festival (observed)' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-25', name: "Buddha's Birthday" },
    { date: '2026-06-19', name: 'Tuen Ng Festival' },
    { date: '2026-07-01', name: 'HKSAR Establishment Day' },
    { date: '2026-09-26', name: 'Mid-Autumn Festival (observed)' },
    { date: '2026-10-01', name: 'National Day' },
    { date: '2026-10-19', name: 'Chung Yeung Festival' },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '12:00' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-28', name: 'Boxing Day (observed)' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '12:00' }
  ],
  shanghai: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-16', name: 'Spring Festival' },
    { date: '2026-02-17', name: 'Spring Festival' },
    { date: '2026-02-18', name: 'Spring Festival' },
    { date: '2026-02-19', name: 'Spring Festival' },
    { date: '2026-02-20', name: 'Spring Festival' },
    { date: '2026-04-06', name: 'Qingming Festival' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-04', name: 'Labour Day Holiday' },
    { date: '2026-05-05', name: 'Labour Day Holiday' },
    { date: '2026-06-19', name: 'Dragon Boat Festival' },
    { date: '2026-09-25', name: 'Mid-Autumn Festival' },
    { date: '2026-10-01', name: 'National Day' },
    { date: '2026-10-02', name: 'National Day' },
    { date: '2026-10-05', name: 'National Day Holiday' },
    { date: '2026-10-06', name: 'National Day Holiday' },
    { date: '2026-10-07', name: 'National Day Holiday' }
  ],
  seoul: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-16', name: 'Lunar New Year' },
    { date: '2026-02-17', name: 'Lunar New Year' },
    { date: '2026-02-18', name: 'Lunar New Year' },
    { date: '2026-03-02', name: 'Independence Day (observed)' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-05', name: "Children's Day" },
    { date: '2026-05-25', name: "Buddha's Birthday (observed)" },
    { date: '2026-06-06', name: 'Memorial Day' },
    { date: '2026-08-17', name: 'Liberation Day (observed)' },
    { date: '2026-09-24', name: 'Chuseok' },
    { date: '2026-09-25', name: 'Chuseok' },
    { date: '2026-10-05', name: 'National Foundation Day (observed)' },
    { date: '2026-10-09', name: 'Hangeul Day' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-31', name: 'Year-end Holiday' }
  ],
  singapore: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-17', name: 'Lunar New Year' },
    { date: '2026-02-18', name: 'Lunar New Year' },
    { date: '2026-03-21', name: 'Hari Raya Puasa' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-25', name: 'Vesak Day' },
    { date: '2026-05-28', name: 'Hari Raya Haji' },
    { date: '2026-08-10', name: 'National Day (observed)' },
    { date: '2026-11-09', name: 'Deepavali (observed)' },
    { date: '2026-12-25', name: 'Christmas Day' }
  ],
  mumbai: [
    { date: '2026-01-26', name: 'Republic Day' },
    { date: '2026-03-04', name: 'Mahashivratri' },
    { date: '2026-03-21', name: 'Eid al-Fitr' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
    { date: '2026-04-21', name: 'Ram Navami' },
    { date: '2026-05-01', name: 'Maharashtra Day' },
    { date: '2026-05-28', name: 'Bakri Eid' },
    { date: '2026-06-26', name: 'Muharram' },
    { date: '2026-08-15', name: 'Independence Day' },
    { date: '2026-09-14', name: 'Ganesh Chaturthi' },
    { date: '2026-10-02', name: 'Gandhi Jayanti' },
    { date: '2026-10-20', name: 'Diwali (Lakshmi Pujan)', closeAt: '13:30' },
    { date: '2026-10-21', name: 'Balipratipada' },
    { date: '2026-11-08', name: 'Guru Nanak Jayanti' },
    { date: '2026-12-25', name: 'Christmas Day' }
  ],
  jakarta: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-17', name: 'Lunar New Year' },
    { date: '2026-03-21', name: 'Eid al-Fitr' },
    { date: '2026-03-22', name: 'Eid al-Fitr' },
    { date: '2026-03-23', name: 'Eid al-Fitr' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-14', name: 'Ascension Day' },
    { date: '2026-05-28', name: 'Eid al-Adha' },
    { date: '2026-08-17', name: 'Independence Day' },
    { date: '2026-12-24', name: 'Christmas Eve' },
    { date: '2026-12-25', name: 'Christmas Day' }
  ],
  sydney: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-26', name: 'Australia Day' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-04-27', name: 'ANZAC Day (observed)' },
    { date: '2026-06-08', name: "King's Birthday" },
    { date: '2026-12-24', name: 'Christmas Eve', closeAt: '14:10' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-28', name: 'Boxing Day (observed)' },
    { date: '2026-12-31', name: "New Year's Eve", closeAt: '14:10' }
  ],
  wellington: [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-02', name: 'Day after New Year' },
    { date: '2026-01-19', name: 'Wellington Anniversary' },
    { date: '2026-02-06', name: 'Waitangi Day' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-04-27', name: 'ANZAC Day (observed)' },
    { date: '2026-06-01', name: "King's Birthday" },
    { date: '2026-06-26', name: 'Matariki' },
    { date: '2026-10-26', name: 'Labour Day' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-28', name: 'Boxing Day (observed)' }
  ]
};

/**
 * Returns the holiday entry for a market on the given local date (yyyy-mm-dd),
 * or `null` if no holiday is observed that day.
 *
 * @param {object} market
 * @param {string} dateStr 'YYYY-MM-DD' in the market's local timezone.
 * @returns {{date:string, name:string, closeAt?:string}|null}
 */
export function getHoliday(market, dateStr) {
  const list = HOLIDAYS[market.id];
  if (!list) return null;
  return list.find(h => h.date === dateStr) || null;
}
