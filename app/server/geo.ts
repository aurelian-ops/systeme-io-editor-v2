import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/**
 * The visitor's country from their IP, as the CDN in front of the site already knows it (Cloudflare, Vercel,
 * CloudFront, Fastly or a proxy set these headers). No third-party lookup: the visitor's IP never leaves our servers.
 * Answers { country: "MA" } or { country: null } when no header is there (local development).
 */
const HEADERS = ['cf-ipcountry', 'x-vercel-ip-country', 'cloudfront-viewer-country', 'fastly-geo-country-code', 'x-country-code', 'x-geo-country']

export function countryFrom(req: IncomingMessage): string | null {
  for (const h of HEADERS) {
    const v = req.headers[h]
    const c = (Array.isArray(v) ? v[0] : v)?.trim().toUpperCase()
    // "XX" / "T1" are Cloudflare's "unknown" and "Tor"
    if (c && /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1') return c
  }
  return null
}

/** GET /api/geo, on the dev server and in the deployed function */
export function geoHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'private, max-age=3600')
  res.end(JSON.stringify({ country: countryFrom(req) }))
}

export function geoPlugin(): Plugin {
  return {
    name: 'editor-geo',
    configureServer(server) {
      server.middlewares.use('/api/geo', geoHandler)
    },
  }
}
