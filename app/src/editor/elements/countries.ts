import US_FLAG from 'country-flag-icons/string/3x2/US'

/** A country for the phone and country fields: its code, English name, dial code and SVG flag. */
export interface Country {
  code: string
  name: string
  dial: string
}

let list: Country[] | null = null
let flags: Record<string, string> = { US: US_FLAG }
let loading: Promise<Country[]> | null = null

/**
 * Every country with its dial code (from libphonenumber) and SVG flag (no emoji, so every system draws the same).
 * Loaded on demand, the first time a phone or country field needs them.
 */
export function loadCountries(): Promise<Country[]> {
  if (!loading) {
    loading = Promise.all([import('libphonenumber-js/min'), import('country-flag-icons/string/3x2')]).then(([phone, f]) => {
      const names = new Intl.DisplayNames(['en'], { type: 'region' })
      flags = f as unknown as Record<string, string>
      list = phone
        .getCountries()
        .map((code) => ({ code, name: names.of(code) ?? code, dial: `+${phone.getCountryCallingCode(code)}` }))
        .sort((a, b) => a.name.localeCompare(b.name))
      return list
    })
  }
  return loading
}
export const countriesNow = () => list
export const flagSvg = (code: string) => flags[code] ?? ''

/** A quick first guess with nothing loaded: the browser language's region (en-GB → GB), else the United States. */
export function guessCountry(): string {
  return detected ?? (localeRegion() || 'US')
}
function localeRegion() {
  const region = typeof navigator !== 'undefined' ? navigator.language.split('-')[1]?.toUpperCase() : undefined
  return region && /^[A-Z]{2}$/.test(region) ? region : ''
}

let detected: string | null = null
let detecting: Promise<string> | null = null
/**
 * The visitor's country, best source first: their IP country from our own server (the CDN's country header, no
 * third-party lookup), then their time zone (Africa/Casablanca → Morocco), then their browser language, then the US.
 */
export function detectCountry(): Promise<string> {
  detecting ??= (async () => {
    try {
      const r = await fetch('/api/geo', { headers: { accept: 'application/json' } })
      const j = r.ok ? ((await r.json()) as { country?: string | null }) : null
      if (j?.country && /^[A-Z]{2}$/.test(j.country)) return (detected = j.country)
    } catch {
      /* no server (a static export): fall back to the time zone */
    }
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const { getCountryForTimezone } = await import('countries-and-timezones')
      const c = tz ? getCountryForTimezone(tz)?.id : undefined
      if (c) return (detected = c)
    } catch {
      /* unknown zone */
    }
    return (detected = localeRegion() || 'US')
  })()
  return detecting
}
