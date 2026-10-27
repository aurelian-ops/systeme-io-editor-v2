import { createRoot } from 'react-dom/client'
import { toJpeg } from 'html-to-image'
import { PageView } from '../render/PageView'
import { DEVICE_WIDTH, type Device, type PageDoc } from '../types'

/**
 * How the page really looks, for the AI's critic: the page drawn off screen at a device's width (never shown), a
 * small picture of it, and facts measured from the layout (overlaps, overflow, tiny text, long headlines) that a
 * model can't reliably see in a picture. Research: research/agent-reliability-research.md, ai-builders-research.md.
 */

export interface Look {
  device: Device
  shot?: string
  facts: string[]
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function lookAt(doc: PageDoc, device: Device): Promise<Look> {
  const host = document.createElement('div')
  const W = DEVICE_WIDTH[device]
  Object.assign(host.style, { position: 'fixed', left: '-20000px', top: '0', width: `${W}px`, pointerEvents: 'none', zIndex: '-1' })
  document.body.appendChild(host)
  const root = createRoot(host)
  root.render(<PageView doc={doc} device={device} editable />)
  // fonts, images and the first layout pass
  await wait(900)
  const page = host.querySelector<HTMLElement>('.page-root')
  const facts = page ? measure(page, device) : []
  let shot: string | undefined
  try {
    if (page)
      shot = await toJpeg(page, {
        quality: 0.7,
        pixelRatio: Math.min(1, (device === 'mobile' ? 390 : 760) / W),
        skipFonts: true,
        filter: (n) => !(n instanceof HTMLElement && (n.dataset.emptyDrop !== undefined || n.classList.contains('sio-slide-empty'))),
        imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      })
  } catch {
    /* no picture, the facts still count */
  }
  root.unmount()
  host.remove()
  return { device, shot, facts }
}

const TEXTY = new Set(['headline', 'text', 'button', 'list', 'eyebrow', 'quote', 'price'])

function measure(page: HTMLElement, device: Device): string[] {
  const out: string[] = []
  const base = page.getBoundingClientRect()
  const nodes = [...page.querySelectorAll<HTMLElement>('[data-node]')]
  // only what a visitor can see (closed FAQ answers and other carousel slides are hidden on purpose)
  const leaves = nodes.filter((n) => TEXTY.has(n.dataset.type ?? '') && !n.closest('[inert]') && n.getClientRects().length > 0)
  const box = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return { l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top, w: r.width, h: r.height }
  }
  // 1. text or buttons sticking out of the page or their box
  for (const n of leaves) {
    const b = box(n)
    if (b.w > 0 && (b.r > base.width + 2 || b.l < -2)) out.push(`${n.dataset.node} (${n.dataset.type}) runs off the ${device} screen`)
    const inner = n.firstElementChild as HTMLElement | null
    if (inner && inner.scrollWidth > inner.clientWidth + 4 && getComputedStyle(inner).overflowX !== 'visible') out.push(`${n.dataset.node} (${n.dataset.type}) text overflows its box on ${device}`)
  }
  // 2. text and buttons covering each other
  for (let i = 0; i < leaves.length; i++)
    for (let j = i + 1; j < leaves.length; j++) {
      const a = box(leaves[i])
      const c = box(leaves[j])
      if (!a.w || !c.w || leaves[i].contains(leaves[j]) || leaves[j].contains(leaves[i])) continue
      const x = Math.min(a.r, c.r) - Math.max(a.l, c.l)
      const y = Math.min(a.b, c.b) - Math.max(a.t, c.t)
      if (x > 6 && y > 6) out.push(`${leaves[i].dataset.node} (${leaves[i].dataset.type}) overlaps ${leaves[j].dataset.node} (${leaves[j].dataset.type}) on ${device}`)
    }
  // 3. headline length and tiny text
  for (const n of leaves) {
    const cs = getComputedStyle(n.querySelector('h1,h2,h3,h4,p,a,span,li') ?? n)
    const size = parseFloat(cs.fontSize)
    const lh = parseFloat(cs.lineHeight) || size * 1.2
    const lines = Math.round(box(n).h / lh)
    if (n.dataset.type === 'headline' && n.querySelector('h1') && lines > (device === 'mobile' ? 5 : 3)) out.push(`${n.dataset.node} the main headline takes ${lines} lines on ${device}`)
    if (device === 'mobile' && size && size < 14 && n.dataset.type !== 'eyebrow') out.push(`${n.dataset.node} (${n.dataset.type}) text is ${Math.round(size)}px on mobile`)
  }
  // 4. a header row taller than it should be on phones, and the whole page wider than the screen
  const first = page.querySelector<HTMLElement>('section')
  if (device === 'mobile' && first?.querySelector('[data-type="menu"]') && box(first).h > 140) out.push(`${first.dataset.node} the header is ${Math.round(box(first).h)}px tall on mobile`)
  if (page.scrollWidth > base.width + 4) out.push(`the page scrolls sideways on ${device} (${page.scrollWidth}px wide)`)
  // 5. images still waiting for a photo, and empty boxes
  const planned = page.querySelectorAll('.sio-media-empty').length
  if (planned) out.push(`${planned} image spot(s) still empty`)
  return [...new Set(out)].slice(0, 24)
}
