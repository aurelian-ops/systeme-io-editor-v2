import { useEffect, type CSSProperties, type RefObject } from 'react'
import type { Motion, Node } from '../types'

/**
 * Animations on the live page (and in Preview), never on the editor canvas. Each element carries its motion as
 * data attributes; one observer plays each entrance once, as the element scrolls into view. Visitors who ask for
 * less motion see everything at once, and if this script never runs nothing stays hidden (the hidden "before"
 * states only apply once the page is marked ready).
 */

const DURATION = { quick: 450, normal: 700, slow: 1000 } as const

/** The attributes and CSS variables a moving element gets (nothing in the editor). */
export function motionAttrs(node: Node, delay?: number): { attrs: Record<string, string>; style: CSSProperties; css?: string } | null {
  const m = node.props.motion
  if (!m) return null
  const attrs: Record<string, string> = {}
  const style: Record<string, string> = {}
  const custom = m.custom?.keyframes ? keyframes(m.custom.keyframes) : null
  if (custom) attrs['data-m-custom'] = node.id
  // a staggered container does not move itself: its items do, one after another
  else if (m.stagger) attrs['data-m-stagger'] = m.enter ?? 'fade-up'
  else if (m.enter) attrs['data-m-enter'] = m.enter
  if (m.hover) attrs['data-m-hover'] = m.hover
  if (m.scroll) attrs['data-m-scroll'] = m.scroll
  if (m.count) attrs['data-m-count'] = ''
  if (m.typing) attrs['data-m-typing'] = ''
  if (custom && m.custom?.split) attrs['data-m-split'] = m.custom.split
  style['--m-dur'] = `${m.custom?.duration ?? DURATION[m.speed ?? 'normal']}ms`
  if (delay) style['--m-delay'] = `${delay}s`
  if (m.custom?.easing && /^[a-z0-9(),.\s-]+$/i.test(m.custom.easing)) style['--m-ease'] = m.custom.easing
  if (!Object.keys(attrs).length) return null
  // tied to the scroll position (browsers with scroll-driven animations; others simply show the element)
  if (custom && m.custom?.trigger === 'scroll')
    return {
      attrs: { ...attrs, 'data-m-custom-scroll': '' },
      style: style as CSSProperties,
      css:
        `@keyframes sio-c-${node.id}{${custom}}` +
        `@supports (animation-timeline: view()){@media (prefers-reduced-motion: no-preference){[data-m-custom="${node.id}"]{animation:sio-c-${node.id} linear both;animation-timeline:view();animation-range:entry 0% exit 100%}}}`,
    }
  const css = custom
    ? `@keyframes sio-c-${node.id}{${custom}}` +
      // whole element, or each letter / word when split
      `.sio-motion-ready [data-m-custom="${node.id}"]${m.custom?.split ? ' .sio-part' : ''}{animation:sio-c-${node.id} var(--m-dur) var(--m-ease,cubic-bezier(.22,1,.36,1)) calc(var(--m-delay,0s) + var(--m-i,0) * 40ms) both paused}` +
      `.sio-motion-ready [data-m-custom="${node.id}"].sio-in${m.custom?.split ? ' .sio-part' : ''}{animation-play-state:running}`
    : undefined
  return { attrs, style: style as CSSProperties, css }
}

/** Only keyframe blocks ("from{…} 40%{…} to{…}") with plain CSS declarations: nothing that could leave the rule. */
function keyframes(src: string): string | null {
  const t = src.trim().replace(/^@keyframes\s+[\w-]+\s*\{([\s\S]*)\}$/, '$1')
  if (!t || t.length > 2000 || /[<>@\\`]|url\(|expression|import/i.test(t)) return null
  if (!/^(\s*(from|to|\d{1,3}(\.\d+)?%)(\s*,\s*(from|to|\d{1,3}(\.\d+)?%))*\s*\{[^{}]*\})+\s*$/i.test(t)) return null
  return t
}

const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Plays every animation on a live page. Re-scans when the page changes (Preview while editing). */
export function useMotion(root: RefObject<HTMLElement | null>, on: boolean, version: unknown) {
  useEffect(() => {
    const page = root.current
    if (!on || !page) return
    const calm = reduce()
    const watched = new Map<Element, HTMLElement>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          io.unobserve(e.target)
          play(watched.get(e.target) ?? (e.target as HTMLElement), calm)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    const moving = page.querySelectorAll<HTMLElement>('[data-m-enter],[data-m-stagger],[data-m-custom]:not([data-m-custom-scroll]),[data-m-count],[data-m-typing]')
    moving.forEach((el) => {
      if (el.dataset.mStagger !== undefined) prepareStagger(el)
      if (el.dataset.mSplit) split(el, el.dataset.mSplit as 'letters' | 'words')
      if (calm) play(el, true)
      // a clip reveal starts fully clipped, which the browser counts as never on screen: its container is watched instead
      else if (el.dataset.mEnter === 'clip' && el.parentElement) {
        watched.set(el.parentElement, el)
        io.observe(el.parentElement)
      } else io.observe(el)
    })
    page.classList.add('sio-motion-ready')
    const stopParallax = calm ? undefined : parallax(page)
    const stopMarquees = calm ? undefined : marquees(page)
    return () => {
      io.disconnect()
      stopParallax?.()
      stopMarquees?.()
      page.classList.remove('sio-motion-ready')
      page.querySelectorAll('.sio-in').forEach((el) => el.classList.remove('sio-in'))
    }
  }, [root, on, version])
}

function play(el: HTMLElement, calm: boolean) {
  el.classList.add('sio-in')
  el.querySelectorAll<HTMLElement>('[data-m-item]').forEach((x) => x.classList.add('sio-in'))
  if (calm) return
  if (el.dataset.mCount !== undefined) countUp(el)
  if (el.dataset.mTyping !== undefined) typeIn(el)
}

/** A staggered container's items: its own child elements (or a list's lines), each with its turn. */
function prepareStagger(el: HTMLElement) {
  const kids = [...el.querySelectorAll<HTMLElement>('[data-node]')].filter((k) => k.parentElement?.closest('[data-node]') === el)
  const items = kids.length ? kids : [...el.querySelectorAll<HTMLElement>('li')]
  items.forEach((k, i) => {
    k.dataset.mItem = ''
    k.dataset.mEnter = el.dataset.mStagger
    k.style.setProperty('--m-delay', `calc(${el.style.getPropertyValue('--m-delay') || '0s'} + ${i * 90}ms)`)
  })
}

/** Text split into letters or words, each animated in turn (a custom animation's "split"). */
function split(el: HTMLElement, by: 'letters' | 'words') {
  if (el.dataset.mSplitDone) return
  el.dataset.mSplitDone = '1'
  let i = 0
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  while (walker.nextNode()) texts.push(walker.currentNode as Text)
  for (const t of texts) {
    if (!t.data.trim()) continue
    const frag = document.createDocumentFragment()
    for (const part of by === 'letters' ? [...t.data] : t.data.split(/(\s+)/)) {
      if (!part.trim()) {
        frag.append(part)
        continue
      }
      const span = document.createElement('span')
      span.className = 'sio-part'
      span.style.display = 'inline-block'
      span.style.setProperty('--m-i', String(i++))
      span.textContent = part
      frag.append(span)
    }
    t.replaceWith(frag)
  }
}

/** Numbers count up from zero to what is written ("2,400+" stays "2,400+"), once. */
function countUp(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const items: { t: Text; parts: (string | number)[]; decimals: number[] }[] = []
  while (walker.nextNode()) {
    const t = walker.currentNode as Text
    if (!/\d/.test(t.data)) continue
    const parts: (string | number)[] = []
    const decimals: number[] = []
    let last = 0
    for (const m of t.data.matchAll(/\d[\d,]*(\.\d+)?/g)) {
      parts.push(t.data.slice(last, m.index))
      parts.push(Number(m[0].replace(/,/g, '')))
      decimals.push(m[1] ? m[1].length - 1 : 0)
      last = m.index! + m[0].length
    }
    parts.push(t.data.slice(last))
    items.push({ t, parts, decimals })
  }
  if (!items.length) return
  const dur = 1400
  const start = performance.now()
  const fmt = (n: number, d: number) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  const tick = (now: number) => {
    const k = Math.min(1, (now - start) / dur)
    const e = 1 - Math.pow(1 - k, 3)
    for (const it of items) {
      let j = 0
      it.t.data = it.parts.map((p) => (typeof p === 'number' ? fmt(p * e, it.decimals[j++]) : p)).join('')
    }
    if (k < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/** Words appear as if typed, about 28 letters a second. */
function typeIn(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const texts: { t: Text; full: string }[] = []
  while (walker.nextNode()) texts.push({ t: walker.currentNode as Text, full: (walker.currentNode as Text).data })
  const total = texts.reduce((n, x) => n + x.full.length, 0)
  if (!total) return
  // keep the element's height while it types, so the page below does not jump
  el.style.minHeight = `${el.offsetHeight}px`
  texts.forEach((x) => (x.t.data = ''))
  const start = performance.now()
  const tick = (now: number) => {
    let left = Math.floor(((now - start) / 1000) * 28)
    for (const x of texts) {
      const n = Math.max(0, Math.min(x.full.length, left))
      x.t.data = x.full.slice(0, n)
      left -= x.full.length
    }
    if (Math.floor(((now - start) / 1000) * 28) < total) requestAnimationFrame(tick)
    else el.style.minHeight = ''
  }
  requestAnimationFrame(tick)
}

/** Photos that drift a little slower than the page (at most 40px either way). */
function parallax(page: HTMLElement) {
  const els = [...page.querySelectorAll<HTMLElement>('[data-m-scroll="parallax"]')]
  if (!els.length) return
  let raf = 0
  const update = () => {
    raf = 0
    const vh = innerHeight
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > vh) continue
      const off = Math.max(-40, Math.min(40, ((r.top + r.height / 2 - vh / 2) / vh) * -60))
      const imgs = el.querySelectorAll<HTMLElement>('img')
      imgs.forEach((img) => (img.style.transform = `translateY(${off.toFixed(1)}px) scale(1.12)`))
      // a section's (or column's) own background photo: it drifts inside the box (drawn 120px taller, so no edge shows)
      if (!imgs.length && el.style.backgroundImage) {
        // covers the box even when drawn 120px taller (sized from the photo's own shape once it is known)
        const size = photoSize(el, r.width, r.height + 120)
        if (size) el.style.backgroundSize = size
        el.style.backgroundPosition = `center calc(50% + ${off.toFixed(1)}px)`
      }
    }
  }
  const on = () => (raf ||= requestAnimationFrame(update))
  addEventListener('scroll', on, { passive: true, capture: true })
  update()
  return () => {
    removeEventListener('scroll', on, { capture: true })
    cancelAnimationFrame(raf)
  }
}

/** The size that makes a box's background photo cover w × h (its overlay layer, if any, keeps covering too). */
const shapes = new Map<string, number | null>()
function photoSize(el: HTMLElement, w: number, h: number): string | null {
  const url = el.style.backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1]
  if (!url) return null
  if (!shapes.has(url)) {
    shapes.set(url, null)
    const img = new Image()
    img.onload = () => shapes.set(url, img.naturalWidth / img.naturalHeight || null)
    img.src = url
  }
  const ratio = shapes.get(url)
  if (!ratio) return null
  const width = Math.ceil(Math.max(w, h * ratio))
  const height = Math.ceil(width / ratio)
  const layers = el.style.backgroundImage.split(/,(?![^(]*\))/).length
  return Array(layers).fill(`${width}px ${height}px`).join(', ')
}

/**
 * An endless line (logos, words, short quotes): the items are laid in one row, copied once, and slide left at about
 * 40px a second; it pauses while pointed at and when it is off screen.
 */
function marquees(page: HTMLElement) {
  const els = [...page.querySelectorAll<HTMLElement>('[data-m-scroll="marquee"]')]
  const undo: (() => void)[] = []
  for (const el of els) {
    const track = [...el.children].find((k) => k.tagName !== 'STYLE') as HTMLElement | undefined
    if (!track || track.dataset.mTrack) continue
    track.dataset.mTrack = '1'
    const before = track.getAttribute('style') ?? ''
    const items = [...track.children] as HTMLElement[]
    items.forEach((k) => {
      const copy = k.cloneNode(true) as HTMLElement
      copy.setAttribute('aria-hidden', 'true')
      copy.removeAttribute('id')
      copy.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'))
      track.append(copy)
    })
    Object.assign(track.style, { display: 'flex', flexWrap: 'nowrap', width: 'max-content', gap: getComputedStyle(track).gap || '48px', gridTemplateColumns: 'none' })
    // each item as wide as its content (columns normally stretch to the whole row)
    ;[...track.children].forEach((k) => Object.assign((k as HTMLElement).style, { flex: '0 0 auto', width: 'max-content', maxWidth: 'none' }))
    el.style.overflow = 'hidden'
    el.style.maskImage = el.style.webkitMaskImage = 'linear-gradient(90deg, transparent, #000 64px, #000 calc(100% - 64px), transparent)'
    const secs = Math.max(12, track.scrollWidth / 2 / 40)
    const anim = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: secs * 1000, iterations: Infinity, easing: 'linear' })
    const pause = () => anim.pause()
    const resume = () => anim.play()
    el.addEventListener('pointerenter', pause)
    el.addEventListener('pointerleave', resume)
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? anim.play() : anim.pause()))
    io.observe(el)
    undo.push(() => {
      anim.cancel()
      io.disconnect()
      el.removeEventListener('pointerenter', pause)
      el.removeEventListener('pointerleave', resume)
      items.forEach(() => track.lastElementChild?.remove())
      track.setAttribute('style', before)
      delete track.dataset.mTrack
    })
  }
  return () => undo.forEach((f) => f())
}

export type { Motion }
