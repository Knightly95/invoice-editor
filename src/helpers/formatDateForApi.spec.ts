import formatDateForApi from 'helpers/formatDateForApi'

// 2025-03-14 23:30 UTC = 2025-03-15 00:30 in UTC+1 (Paris).
// Used to verify local-date extraction vs. UTC-shifted extraction.
const UTC_NEAR_MIDNIGHT = new Date(Date.UTC(2025, 2, 14, 23, 30, 0))

// This test is only meaningful east of UTC — skip it in UTC environments.
// To exercise it locally: TZ=Europe/Paris npx jest formatDateForApi
const isEastOfUtc = UTC_NEAR_MIDNIGHT.getDate() === 15
const itIfEastOfUtc = isEastOfUtc ? it : it.skip

describe('formatDateForApi', () => {
  it('returns the local YYYY-MM-DD date string (noon, no timezone ambiguity)', () => {
    // Noon eliminates any UTC/local difference regardless of the runner timezone.
    expect(formatDateForApi(new Date(2025, 2, 15, 12, 0, 0))).toBe('2025-03-15')
  })

  it('pads single-digit month and day with leading zeros', () => {
    expect(formatDateForApi(new Date(2025, 0, 9, 12, 0, 0))).toBe('2025-01-09')
  })

  // The critical safety test: Date.toISOString() shifts to UTC before formatting,
  // rolling back to the previous calendar day for UTC+1 users at midnight.
  // dayjs(date).format() reads local time components and avoids that rollback.
  itIfEastOfUtc('uses local date, not UTC-shifted date (UTC+1 guard)', () => {
    expect(formatDateForApi(UTC_NEAR_MIDNIGHT)).toBe('2025-03-15')
    expect(formatDateForApi(UTC_NEAR_MIDNIGHT)).not.toBe(
      UTC_NEAR_MIDNIGHT.toISOString().slice(0, 10) // '2025-03-14' ← wrong in UTC+1
    )
  })
})
