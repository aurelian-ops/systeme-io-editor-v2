# The editor

React + Vite. See the README at the root of the repository to run it and deploy it.

| Path | What it is |
|---|---|
| `src/editor/` | The editor: canvas, panels, elements, and the AI client (`src/editor/ai/`). |
| `src/editor/recipes.ts` | The designed sections the AI builds pages from (`recipeMeta.ts` is their catalogue). |
| `server/ai.ts` | The AI's routes: writing pages, editing, photos, uploads. The OpenAI key stays here, never in the browser. |
| `server/skills/` | The design and conversion guides sent to the AI. |
| `server/store.ts` | Where photos and uploads are kept: `.data/` while developing, Vercel Blob when deployed (`blobStore.ts`). |
| `server/vercel.ts` | The deployed function that serves every route; `vite.api.config.ts` bundles it and `scripts/vercel-output.mjs` packages the build for Vercel. |

Scripts: `npm run dev`, `npm run build`, `npm run build:vercel`, `npm run lint`.
