import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { aiPlugin } from './server/ai.ts'
import { geoPlugin } from './server/geo.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), aiPlugin(env), geoPlugin()],
    // the AI's stored photos and the Vercel build are not source: never reload the editor for them
    server: { watch: { ignored: ['**/.data/**', '**/.vercel/**'] } },
  }
})
