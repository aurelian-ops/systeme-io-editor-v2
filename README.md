# systeme.io Editor V2

A prototype of the next systeme.io page editor: the same layout as today's editor, with AI built in. Describe a page and the AI writes it section by section, with its own photos, in any language. Then edit everything by hand or by asking.

## What's in this repository

| Folder | What it is |
|---|---|
| `app/` | The editor (React + Vite) and its AI server. This is what gets deployed. |
| `research/` | Research reports behind the AI and design decisions. |
| `apple-design.md`, `premium-ui-playbook.md` | The design rules the editor follows. |

## Run it locally

```bash
cd app
cp .env.example .env.local   # then paste an OpenAI key into OPENAI_API_KEY
npm install
npm run dev                  # http://localhost:5173
```

Without a key the editor still works, and the AI only handles simple edits offline. Photos the AI creates while you develop are kept in `app/.data/`, which is never committed.

## Deploy on Vercel

The build (`npm run build:vercel`, set in `app/vercel.json`) produces the editor as static files plus one function that runs the AI. Set up the project once:

1. In Vercel, import this repository and set **Root Directory** to `app`.
2. In **Settings → Environment Variables**, add `OPENAI_API_KEY`. `OPENAI_MODEL` and `OPENAI_IMAGE_MODEL` are optional.
3. In **Storage**, create a **Blob** store and connect it to the project. It keeps the photos the AI creates and the images people attach. Vercel adds `BLOB_READ_WRITE_TOKEN` by itself.
4. Deploy. Every push to `main` deploys again, and every branch gets its own preview address.

Keep **Deployment Protection** on, so only people in the Vercel team can open the editor. Every page the AI writes uses credits on the OpenAI account.

## Checks

```bash
cd app
npm run build    # typecheck and build
npm run lint
```
