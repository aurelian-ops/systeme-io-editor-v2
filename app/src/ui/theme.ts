import { useSyncExternalStore } from 'react'

/** Light or dark (Midnight) editor chrome. The user's page is never recoloured. Remembered per browser. */
export type Theme = 'light' | 'dark'

const KEY = 'sio-editor-theme'
const listeners = new Set<() => void>()

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

let current: Theme = read()
document.documentElement.dataset.theme = current

export function setTheme(t: Theme) {
  if (t === current) return
  current = t
  const root = document.documentElement
  // ease the change for a moment instead of flashing
  root.dataset.themeSwitching = ''
  root.dataset.theme = t
  window.setTimeout(() => delete root.dataset.themeSwitching, 320)
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* private mode: still switches, just isn't remembered */
  }
  listeners.forEach((l) => l())
}

export function useTheme() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  )
}
