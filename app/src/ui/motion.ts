/**
 * The editor's one motion layer (Apple's "Designing Fluid Interfaces", for the web).
 * Springs are described the way Apple does: damping ratio + response (seconds).
 * Everything starts from the current on-screen value and can be interrupted at any time.
 */

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface SpringOptions {
  from: number
  to: number
  /** px/s (or units/s) the value is already moving at, e.g. a flick's release speed */
  velocity?: number
  /** 1 = no overshoot (default UI), ~0.8 only after a gesture with momentum */
  damping?: number
  /** how quickly it gets there, in seconds (not a duration) */
  response?: number
  onUpdate: (value: number, velocity: number) => void
  onDone?: () => void
}

export interface Spring {
  stop: () => void
  retarget: (to: number) => void
  readonly value: number
  readonly velocity: number
}

export function spring({ from, to, velocity = 0, damping = 1, response = 0.32, onUpdate, onDone }: SpringOptions): Spring {
  const k = Math.pow((2 * Math.PI) / response, 2)
  const c = (4 * Math.PI * damping) / response
  let x = from
  let v = velocity
  let target = to
  let last = performance.now()
  let raf = 0
  let stopped = false
  if (reducedMotion()) {
    onUpdate(to, 0)
    queueMicrotask(() => onDone?.())
    return { stop: () => {}, retarget: () => {}, value: to, velocity: 0 }
  }
  const tick = (now: number) => {
    if (stopped) return
    const dt = Math.min(0.032, (now - last) / 1000)
    last = now
    for (let i = 0; i < 4; i++) {
      const a = -k * (x - target) - c * v
      v += (a * dt) / 4
      x += (v * dt) / 4
    }
    if (Math.abs(v) < 0.02 * Math.max(1, Math.abs(target - from)) && Math.abs(x - target) < 0.002 * Math.max(1, Math.abs(target - from)) + 0.05) {
      x = target
      v = 0
      onUpdate(x, v)
      onDone?.()
      return
    }
    onUpdate(x, v)
    raf = requestAnimationFrame(tick)
  }
  // draw the starting point now: waiting for the first tick lets the browser paint the end state for one frame
  // (a page change flashed in its final layout, then jumped back and slid)
  onUpdate(x, v)
  raf = requestAnimationFrame(tick)
  return {
    stop: () => {
      stopped = true
      cancelAnimationFrame(raf)
    },
    retarget: (t) => (target = t),
    get value() {
      return x
    },
    get velocity() {
      return v
    },
  }
}

/** Where a flick will come to rest (Apple's exponential deceleration). */
export const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate)

/** Soft limit: the further past the edge, the less it follows. */
export const rubberband = (overshoot: number, dimension: number, c = 0.55) => (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot))

/** Pointer velocity from the last few moves (px/s). */
export function velocityTracker() {
  let h: [number, number][] = []
  return {
    add(t: number, v: number) {
      h.push([t, v])
      if (h.length > 6) h = h.slice(-6)
    },
    get() {
      if (h.length < 2) return 0
      const [t0, v0] = h[0]
      const [t1, v1] = h[h.length - 1]
      return ((v1 - v0) / Math.max(1, t1 - t0)) * 1000
    },
    reset() {
      h = []
    },
  }
}

/* ---------------- FLIP: things glide to their new place after any page change ---------------- */

type Rects = Map<string, DOMRect>
let pending: Rects | null = null

/** Remember where every element is on the canvas right before a change. */
export function captureLayout() {
  if (reducedMotion()) return
  const m: Rects = new Map()
  document.querySelectorAll<HTMLElement>('.page-root [data-node]').forEach((el) => {
    const key = el.dataset.node + '|' + el.dataset.device
    m.set(key, el.getBoundingClientRect())
  })
  pending = m
}

/* While things glide, anything drawn on top of them (the selection outline, toolbars) redraws every frame. */
const frameListeners = new Set<() => void>()
let gliding = 0
let frameLoop = 0
export function onLayoutFrame(fn: () => void) {
  frameListeners.add(fn)
  return () => void frameListeners.delete(fn)
}
function glideStart() {
  gliding++
  if (frameLoop) return
  const loop = () => {
    frameListeners.forEach((f) => f())
    frameLoop = gliding ? requestAnimationFrame(loop) : 0
  }
  frameLoop = requestAnimationFrame(loop)
}
function glideEnd() {
  gliding = Math.max(0, gliding - 1)
  if (!gliding) queueMicrotask(() => frameListeners.forEach((f) => f()))
}

/**
 * After React has drawn the change, slide each element from its old place to its new one.
 * `settleId`: the element you just dropped; it doesn't travel back from where it was picked up,
 * it settles into its new slot instead.
 */
export function playLayout(settleId?: string) {
  const before = pending
  pending = null
  if (!before) return
  requestAnimationFrame(() => {
    const moved: HTMLElement[] = []
    document.querySelectorAll<HTMLElement>('.page-root [data-node]').forEach((el) => {
      if (settleId && el.closest(`[data-node="${settleId}"]`)) return
      const prev = before.get(el.dataset.node + '|' + el.dataset.device)
      if (!prev) return
      const now = el.getBoundingClientRect()
      const dx = prev.left - now.left
      const dy = prev.top - now.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      // only animate outermost moved elements; children travel with their parent
      if (moved.some((m) => m.contains(el))) return
      moved.push(el)
      const zoom = parseFloat(getComputedStyle(el.closest('[style*="zoom"]') ?? el).zoom || '1') || 1
      el.style.willChange = 'transform'
      glideStart()
      spring({
        from: 1,
        to: 0,
        response: 0.36,
        onUpdate: (p) => (el.style.transform = p ? `translate(${(dx / zoom) * p}px, ${(dy / zoom) * p}px)` : ''),
        onDone: () => {
          el.style.transform = ''
          el.style.willChange = ''
          glideEnd()
        },
      })
    })
    if (settleId)
      document.querySelectorAll<HTMLElement>(`.page-root [data-node="${settleId}"]`).forEach((el) =>
        el.animate(
          [{ opacity: 0.35 }, { opacity: 1 }],
          { duration: 240, easing: 'ease-out' },
        ),
      )
  })
}

/** Something new on the page fades in where it landed. */
export function appear(nodeId: string) {
  if (reducedMotion()) return
  requestAnimationFrame(() =>
    document.querySelectorAll<HTMLElement>(`.page-root [data-node="${nodeId}"]`).forEach((el) =>
      el.animate(
        // opacity only: a scale would make the selection outline measure the wrong size while it plays
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 240, easing: 'ease-out' },
      ),
    ),
  )
}

/**
 * A copy arrives from under its original: it unrolls with the exact spring the elements below slide away on,
 * so it only ever shows the space they have already left (no text drawn over text while it moves).
 */
export function reveal(nodeId: string, fromId: string) {
  if (reducedMotion()) return
  requestAnimationFrame(() =>
    document.querySelectorAll<HTMLElement>(`.page-root [data-node="${nodeId}"]`).forEach((el) => {
      const from = document.querySelector<HTMLElement>(`.page-root [data-node="${fromId}"][data-device="${el.dataset.device}"]`)
      const a = el.getBoundingClientRect()
      const b = from?.getBoundingClientRect()
      // side by side (a horizontal list) unrolls to the right, otherwise downwards
      const across = !!b && a.top < b.bottom - 1 && a.left >= b.right - 1
      glideStart()
      spring({
        from: 1,
        to: 0,
        response: 0.36,
        onUpdate: (p) => (el.style.clipPath = p ? (across ? `inset(0 ${p * 100}% 0 0)` : `inset(0 0 ${p * 100}% 0)`) : ''),
        onDone: () => {
          el.style.clipPath = ''
          glideEnd()
        },
      })
    }),
  )
}

/** Tell overlays that something is being dragged, so they step aside until it lands. */
export function carry(on: boolean) {
  window.dispatchEvent(new CustomEvent('editor:carry', { detail: on }))
}

/* ---------------- Depth: the editor steps back while a dialog is in front ---------------- */

let depth = 0
export function pushDepth() {
  depth++
  document.documentElement.dataset.depth = String(depth)
  return () => {
    depth = Math.max(0, depth - 1)
    if (depth) document.documentElement.dataset.depth = String(depth)
    else delete document.documentElement.dataset.depth
  }
}

/** Run a page change and let everything that moved glide to its new place. */
export function withLayout(fn: () => void) {
  captureLayout()
  fn()
  playLayout()
}

/* ---------------- Exit: things leave the way they came, even after React removed them ---------------- */

/**
 * Call from a layout-effect cleanup: a static copy of the element plays the exit,
 * so every menu and dialog can close smoothly without changing how it is opened or closed.
 */
export function exitGhost(el: HTMLElement | null, keyframes: Keyframe[], ms = 160) {
  if (!el || !el.isConnected || reducedMotion()) return
  const parent = el.parentElement
  const next = el.nextSibling
  if (!parent || !el.getBoundingClientRect().width) return
  const g = el.cloneNode(true) as HTMLElement
  queueMicrotask(() => {
    // still on the page: React only re-ran the effect (dev), nothing is closing
    if (el.isConnected) return
    g.removeAttribute('id')
    g.style.pointerEvents = 'none'
    g.style.animation = 'none'
    g.setAttribute('aria-hidden', 'true')
    g.querySelectorAll('[data-node]').forEach((x) => x.removeAttribute('data-node'))
    parent.insertBefore(g, next && next.parentNode === parent ? next : null)
    const a = g.animate(keyframes, {
      duration: ms,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      fill: 'forwards',
    })
    a.onfinish = () => g.remove()
  })
}

/** Popover / menu entrance anchored to what opened it (scale + blur materialize). */
export function materialize(el: HTMLElement, origin: string) {
  if (reducedMotion()) {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
    return
  }
  el.style.transformOrigin = origin
  el.animate(
    [
      { opacity: 0, transform: 'scale(0.92)', filter: 'blur(6px)' },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
    ],
    { duration: 260, easing: SPRING_EASE },
  )
}
export const dematerialize: Keyframe[] = [
  { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
  { opacity: 0, transform: 'scale(0.94)', filter: 'blur(4px)' },
]

/** A critically damped spring (response ~0.3s) as a CSS / WAAPI easing curve. */
export const SPRING_EASE =
  'linear(0, 0.0175 1.2%, 0.0663 2.5%, 0.1386 3.9%, 0.2286 5.4%, 0.3271 7%, 0.4277 8.7%, 0.5228 10.4%, 0.6127 12.2%, 0.6948 14.1%, 0.7646 16%, 0.8239 18%, 0.8734 20.1%, 0.913 22.3%, 0.9429 24.6%, 0.9651 27%, 0.9807 29.6%, 0.9908 32.4%, 0.9967 35.5%, 0.9996 39%, 1.0006 43.5%, 1.0004 50%, 1)'

/* ---------------- Cross-fade between two versions of the same area ---------------- */

/** Fade a still copy of the current look over the new one (Before / After). */
export function crossfade(el: HTMLElement | null, ms = 260) {
  if (!el || reducedMotion()) return
  const g = el.cloneNode(true) as HTMLElement
  g.style.position = 'absolute'
  g.style.inset = '0'
  g.style.pointerEvents = 'none'
  g.style.zIndex = '20'
  g.setAttribute('aria-hidden', 'true')
  g.querySelectorAll('[data-node]').forEach((x) => x.removeAttribute('data-node'))
  el.parentElement?.appendChild(g)
  g.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: ms,
    easing: 'ease-in-out',
    fill: 'forwards',
  }).onfinish = () => g.remove()
}

/* ---------------- Press: reacts on pointer-down, cancels if you slide off ---------------- */

export function installPress() {
  const SLOP = 10
  let cur: { el: HTMLElement; r: DOMRect } | null = null
  const release = () => {
    if (!cur) return
    delete cur.el.dataset.pressed
    cur = null
  }
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return
      const el = (e.target as HTMLElement | null)?.closest?.('.press') as HTMLElement | null
      if (!el || (el as HTMLButtonElement).disabled) return
      release()
      cur = { el, r: el.getBoundingClientRect() }
      el.dataset.pressed = ''
    },
    true,
  )
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!cur) return
      const { r, el } = cur
      const inside = e.clientX > r.left - SLOP && e.clientX < r.right + SLOP && e.clientY > r.top - SLOP && e.clientY < r.bottom + SLOP
      if (inside) el.dataset.pressed = ''
      else delete el.dataset.pressed
    },
    true,
  )
  window.addEventListener('pointerup', release, true)
  window.addEventListener('pointercancel', release, true)
  window.addEventListener('dragstart', release, true)
  window.addEventListener('blur', release)
}

/* ---------------- Scroll edges: content fades under a header instead of a fixed line ---------------- */

export function installScrollEdges() {
  const mark = (el: Element) => {
    if (!(el instanceof HTMLElement) || !el.classList.contains('scroll-edge')) return
    const on = el.scrollTop > 2
    if (on !== el.hasAttribute('data-scrolled')) el.toggleAttribute('data-scrolled', on)
  }
  document.addEventListener('scroll', (e) => mark(e.target as Element), true)
}
