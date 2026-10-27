// Puts the build in Vercel's Build Output format (.vercel/output), which Vercel deploys as it is:
//   static/            the editor (vite build → dist)
//   functions/api.func the AI server, bundled by vite.api.config.ts
//   config.json        routes: files first, then /api/* and the photo and upload addresses to the function
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'

const out = '.vercel/output'
const fn = `${out}/functions/api.func`
if (!existsSync('dist/index.html')) throw new Error('Run vite build first (dist/ is missing).')
if (!existsSync(`${fn}/index.mjs`)) throw new Error('Run vite build --config vite.api.config.ts first (the function is missing).')

rmSync(`${out}/static`, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync('dist', `${out}/static`, { recursive: true })

writeFileSync(`${fn}/package.json`, JSON.stringify({ type: 'module' }))
writeFileSync(
  `${fn}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      // a page is written in about a minute; a retried answer can take a few
      maxDuration: 300,
    },
    null,
    2,
  ),
)

writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
        { handle: 'filesystem' },
        { src: '^/(api/.*|ai-photos/.*|ai-uploads/.*)$', dest: '/api?__path=$1' },
      ],
    },
    null,
    2,
  ),
)
console.log('Vercel output ready in .vercel/output')
