import { get, head, put } from '@vercel/blob'
import type { Store, StoreDir } from './store.ts'

/**
 * The deployed store: Vercel Blob, through the settings Vercel adds when a Blob store is connected to the project.
 * Files are read back through the app (/ai-photos/…, /ai-uploads/…), so pages never point at the storage itself and
 * the store can stay private.
 */
type Access = 'public' | 'private'
export interface BlobSettings {
  token?: string
  storeId?: string
}

/**
 * The connected store's settings: BLOB_READ_WRITE_TOKEN and BLOB_STORE_ID, or the same names under the custom prefix
 * chosen when connecting it (v2_editor_READ_WRITE_TOKEN…). With only a store id, Vercel's own sign-in (OIDC) is used.
 */
export function blobSettings(env: Record<string, string | undefined> = process.env): BlobSettings | null {
  const custom = Object.keys(env)
    .filter((k) => /_(READ_WRITE_TOKEN|WEBHOOK_PUBLIC_KEY)$/.test(k))
    .map((k) => k.replace(/_(READ_WRITE_TOKEN|WEBHOOK_PUBLIC_KEY)$/, ''))
  for (const prefix of ['BLOB', ...new Set(custom)]) {
    const token = env[`${prefix}_READ_WRITE_TOKEN`] || undefined
    const storeId = env[`${prefix}_STORE_ID`] || undefined
    if (token || storeId) return { token, storeId }
  }
  return null
}

// a store is private (Vercel's default) or public; BLOB_ACCESS says which, and a refusal that names the other kind
// switches to it once, so either kind of store works without setup
let access: Access = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private'
async function withAccess<T>(run: (a: Access) => Promise<T>): Promise<T> {
  try {
    return await run(access)
  } catch (err) {
    // only a refusal about the store's kind (a bad token says "Access denied" and is not one)
    if (!/\b(private|public)\b/i.test(String(err))) throw err
    access = access === 'private' ? 'public' : 'private'
    return run(access)
  }
}

export function blobStore(auth: BlobSettings): Store {
  const at = (dir: StoreDir, name: string) => `${dir}/${name}`
  return {
    has: async (dir, name) => {
      try {
        await head(at(dir, name), auth)
        return true
      } catch {
        return false
      }
    },
    read: async (dir, name) => {
      // a read in the wrong kind finds nothing rather than failing, so the other kind is tried too
      const read = (a: Access) => get(at(dir, name), { ...auth, access: a }).catch(() => null)
      const found = (await read(access)) ?? (await read(access === 'private' ? 'public' : 'private'))
      if (!found?.stream) return null
      return Buffer.from(await new Response(found.stream).arrayBuffer())
    },
    put: async (dir, name, data, type) => {
      await withAccess((a) => put(at(dir, name), data, { ...auth, access: a, addRandomSuffix: false, allowOverwrite: true, contentType: type, cacheControlMaxAge: 31536000 }))
    },
  }
}
