import { readdirSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

/** The skill files, inlined into the function (it has no access to the repository's files). */
const skillsDir = new URL('./server/skills/', import.meta.url)
const skills = Object.fromEntries(readdirSync(skillsDir).filter((f) => f.endsWith('.md')).map((f) => [f, readFileSync(new URL(f, skillsDir), 'utf8')]))

/** The deployed AI function: server/vercel.ts and everything it uses, bundled into one file (npm run build:vercel). */
export default defineConfig({
  publicDir: false,
  define: { __SKILLS__: JSON.stringify(skills) },
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: 'server/vercel.ts',
    outDir: '.vercel/output/functions/api.func',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    copyPublicDir: false,
    rollupOptions: { output: { entryFileNames: 'index.mjs', format: 'es' } },
  },
})
