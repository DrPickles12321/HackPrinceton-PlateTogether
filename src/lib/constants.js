const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// Local-timezone YYYY-MM-DD. Never use toISOString() for day keys — it converts
// to UTC first, which shifts the date around midnight (e.g. 00:00–05:30 in IST,
// evenings in US timezones), putting meals/statuses under the wrong day.
export function localIsoDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// `base` is injectable for tests; callers use the default.
export function getWeekDates(offset = 0, base = new Date()) {
  const dow = base.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(base)
  monday.setDate(base.getDate() + diff + offset * 7)
  const result = {}
  DAY_KEYS.forEach((key, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    result[key] = localIsoDate(d)
  })
  return result
}
