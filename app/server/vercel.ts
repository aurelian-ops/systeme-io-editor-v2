import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { aiRoutes, SKILL_TEXT, type Handler } from './ai.ts'
import { blobStore } from './blobStore.ts'
import { geoHandler } from './geo.ts'
import { diskStore } from './store.ts'

/**
 * The deployed server: one Vercel function answers /api/* and the photo and upload addresses (/ai-photos/…,
 * /ai-uploads/…). Bundled into one file by vite.api.config.ts; scripts/vercel-output.mjs puts it in place.
 */

// the skill files, bundled at build time (vite.api.config.ts)
declare const __SKILLS__: Record<string, string>
Object.assign(SKILL_TEXT, __SKILLS__)

const log = { info: (m: string) => console.log(m), warn: (m: string) => console.warn(m), error: (m: string) => console.error(m) }
// Vercel Blob when a store is connected to the project; a temporary folder otherwise (a local run of the build)
const blob = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
const store = blob ? blobStore() : diskStore(join(tmpdir(), 'editor-ai'))
if (!blob && process.env.VERCEL) console.warn('[editor-ai] No Blob store connected: created photos are not kept. Connect a Blob store to the project.')
const routes: [string, Handler][] = [...aiRoutes(process.env, store, log), ['/api/geo', geoHandler]]

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  // the routing rule passes the address it received as ?__path= (the function itself lives at /api)
  const forwarded = url.searchParams.get('__path')
  const path = forwarded ? `/${forwarded.replace(/^\/+/, '')}` : url.pathname
  url.searchParams.delete('__path')
  const query = url.searchParams.toString()
  for (const [route, handle] of routes) {
    const base = route.replace(/\/$/, '')
    if (path !== base && !path.startsWith(`${base}/`)) continue
    req.url = (path.slice(base.length) || '/') + (query ? `?${query}` : '')
    let passed = false
    await handle(req, res, () => {
      passed = true
    })
    if (!passed) return
  }
  if (!res.headersSent) {
    res.statusCode = 404
    res.end('Not found')
  }
}
