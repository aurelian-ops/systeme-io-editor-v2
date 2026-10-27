import { runAI } from './editor/ai/run'
import { buildRecipe } from './editor/recipes'
import { hardChecks } from './editor/ai/quality'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/theme'
import App from './App.tsx'
import { getState, setColumnCount, setState, update } from './editor/store'
import { fixNode } from './editor/structure'

// dev only: hooks for the test scripts (the same store the editor uses, whatever the module graph did since)
if (import.meta.env.DEV) Object.assign(window, { __sio: getState, __setCols: setColumnCount, __ai: (o: Parameters<typeof runAI>[0]) => runAI(o), __recipe: buildRecipe, __check: () => hardChecks(getState().doc), __update: update, __setState: setState, __fixNode: fixNode })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
