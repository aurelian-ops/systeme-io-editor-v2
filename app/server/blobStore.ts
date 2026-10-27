import { get, head, put } from '@vercel/blob'
import type { Store, StoreDir } from './store.ts'

/**
 * The deployed store: Vercel Blob (the project's BLOB_READ_WRITE_TOKEN, set when a Blob store is connected to it).
 * Files are read back through the app (/ai-photos/…, /ai-uploads/…), so pages never point at the storage itself.
 */
export function blobStore(): Store {
  const at = (dir: StoreDir, name: string) => `${dir}/${name}`
  return {
    has: async (dir, name) => {
      try {
        await head(at(dir, name))
        return true
      } catch {
        return false
      }
    },
    read: async (dir, name) => {
      const found = await get(at(dir, name), { access: 'public' }).catch(() => null)
      if (!found?.stream) return null
      return Buffer.from(await new Response(found.stream).arrayBuffer())
    },
    put: async (dir, name, data, type) => {
      await put(at(dir, name), data, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: type, cacheControlMaxAge: 31536000 })
    },
  }
}
