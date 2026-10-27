import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Where the AI keeps what it makes (created photos) and what you attach (uploads). The app always serves a file at
 * /<dir>/<name>, so pages keep the same image addresses everywhere: files on disk while developing (`.data/`),
 * Vercel Blob when deployed (server/blobStore.ts).
 */
export type StoreDir = 'ai-photos' | 'ai-uploads'

export interface Store {
  has(dir: StoreDir, name: string): Promise<boolean>
  read(dir: StoreDir, name: string): Promise<Buffer | null>
  put(dir: StoreDir, name: string, data: Buffer, type: string): Promise<void>
}

/** Files in a folder on this machine. Names are content hashes, so a file once written never changes. */
export function diskStore(root: string): Store {
  const file = (dir: StoreDir, name: string) => join(root, dir, name)
  return {
    has: async (dir, name) => existsSync(file(dir, name)),
    read: async (dir, name) => (existsSync(file(dir, name)) ? readFileSync(file(dir, name)) : null),
    put: async (dir, name, data) => {
      mkdirSync(join(root, dir), { recursive: true })
      if (!existsSync(file(dir, name))) writeFileSync(file(dir, name), data)
    },
  }
}
