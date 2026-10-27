import { get, head, put } from '@vercel/blob'
import type { Store, StoreDir } from './store.ts'

/**
 * The deployed store: Vercel Blob, through the project's BLOB_READ_WRITE_TOKEN (or BLOB_STORE_ID with Vercel's own
 * sign-in), set when a Blob store is connected to the project. Files are read back through the app (/ai-photos/…,
 * /ai-uploads/…), so pages never point at the storage itself and the store can stay private.
 */
type Access = 'public' | 'private'

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
      // a read in the wrong kind finds nothing rather than failing, so the other kind is tried too
      const read = (a: Access) => get(at(dir, name), { access: a }).catch(() => null)
      const found = (await read(access)) ?? (await read(access === 'private' ? 'public' : 'private'))
      if (!found?.stream) return null
      return Buffer.from(await new Response(found.stream).arrayBuffer())
    },
    put: async (dir, name, data, type) => {
      await withAccess((a) => put(at(dir, name), data, { access: a, addRandomSuffix: false, allowOverwrite: true, contentType: type, cacheControlMaxAge: 31536000 }))
    },
  }
}
