import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LibItem } from '../library'

/**
 * Elements panel, direction E (Apple Keynote / Freeform): rest on a tile and a frosted card shows
 * a small drawing of the element and one line on what it is for.
 */

const svg = (d: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

/** One short line per element: what you would use it for. */
export const HINT: Record<string, string> = {
  text: 'A paragraph of text',
  headline: 'A title, from H1 to H6',
  list: 'Points with a check or an icon',
  contentbox: 'A box that groups elements',
  row1: 'Columns side by side: start with one, add up to 6',
  section: 'A new band across the page',
  form: 'Collect name, email and more',
  input: 'One field: email, name, phone…',
  button: 'Submit, open a link or go to the next step',
  checkbox: 'Consent or an option to tick',
  recaptcha: 'Stops spam sign-ups',
  calendar: 'Let people book a call',
  paybutton: 'Send people to the checkout',
  product: 'Sell something you ship',
  image: 'A photo or a graphic',
  video: 'YouTube, Vimeo or your own file',
  audio: 'A podcast or a sound',
  icon: 'A single icon',
  carousel: 'Images that slide',
  xshare: 'Share this page on X',
  survey: 'Ask a quick question',
  countdown: 'A timer to a date or deadline',
  menu: 'Links to your other pages',
  divider: 'A thin line between parts',
  rawhtml: 'Your own HTML code',
  faq: 'Questions that open on click',
  eyebrow: 'A small line above a title',
  quote: 'A customer quote',
  stat: 'A big number with a label',
  logos: 'Logos of clients or press',
  price: 'A plan with its price and features',
  spacer: 'Empty space between elements',
}

/** Tiny drawings of each element, in the page's neutral greys and the systeme.io blue. */
const PV: Record<string, string> = {
  text: '<i class="d" style="width:90%"></i><i style="width:100%"></i><i style="width:70%"></i>',
  headline: '<i class="d" style="height:9px;width:85%"></i><i class="d" style="height:9px;width:55%"></i>',
  list: '<i style="width:80%;box-shadow:-9px 0 0 -1px var(--brand)"></i><i style="width:70%;box-shadow:-9px 0 0 -1px var(--brand)"></i><i style="width:75%;box-shadow:-9px 0 0 -1px var(--brand)"></i>',
  contentbox: '<div class="box"><i class="d" style="width:60%"></i><i style="width:85%"></i></div>',
  row1: '<div class="rowc"><span></span><span></span><span style="border-style:dashed;opacity:.5"></span></div>',
  section: '<div class="band"><i class="d" style="width:55%;margin:0 auto"></i><i style="width:75%;margin:0 auto"></i></div>',
  form: '<div class="field"></div><div class="field"></div><div class="pill" style="width:100%;border-radius:4px"></div>',
  input: '<div class="field"></div>',
  button: '<div class="pill"></div>',
  checkbox: '<div class="line"><b class="sq on"></b><i style="flex:1"></i></div>',
  recaptcha: '<div class="line card"><b class="sq"></b><i style="flex:1"></i></div>',
  calendar: '<div class="cal">' + Array.from({ length: 15 }, (_, i) => `<b${i === 8 ? ' class="on"' : ''}></b>`).join('') + '</div>',
  paybutton: '<div class="pill" style="width:96px"></div>',
  product: '<div class="prod"><b></b><div><i class="d"></i><i style="width:60%"></i><div class="pill" style="width:44px;height:12px"></div></div></div>',
  image: '<div class="ctr">' + svg('<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>') + '</div>',
  video: '<div class="ctr dark">' + svg('<polygon points="6 3 20 12 6 21 6 3"/>') + '</div>',
  audio: '<div class="line"><b class="dot"></b><i style="flex:1"></i></div>',
  icon:
    '<div class="ctr">' +
    svg(
      '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    ) +
    '</div>',
  carousel: '<div class="slides"><b></b><b class="mid"></b><b></b></div>',
  xshare: '<div class="pill" style="background:#171717"></div>',
  survey: '<i class="d" style="width:70%"></i><i style="width:85%;box-shadow:-9px 0 0 -1px #8f96a3"></i><i style="width:65%;box-shadow:-9px 0 0 -1px #8f96a3"></i>',
  countdown: '<div class="big" style="letter-spacing:.04em">02:14:59</div>',
  menu: '<div class="line" style="justify-content:center;gap:8px"><i style="width:22px"></i><i style="width:22px"></i><i style="width:22px"></i><i style="width:22px"></i></div>',
  divider: '<i style="height:1px;background:#8f96a3"></i>',
  rawhtml: '<div class="big">&lt;/&gt;</div>',
  faq: '<i class="d" style="width:100%"></i><i style="width:100%;opacity:.6"></i><i class="d" style="width:100%"></i>',
  eyebrow: '<i class="b" style="width:36%;height:3px"></i><i class="d" style="width:80%;height:9px"></i>',
  quote: '<div class="big" style="text-align:left;font-size:30px;line-height:16px">“</div><i style="width:90%"></i><i style="width:60%"></i>',
  stat: '<div class="big" style="font-size:28px">98%</div>',
  logos: '<div class="line" style="justify-content:center;gap:8px"><b class="logo"></b><b class="logo"></b><b class="logo"></b><b class="logo"></b></div>',
  price: '<div class="box" style="align-items:center"><div class="big" style="font-size:18px;line-height:18px">$49</div><div class="pill" style="width:56px;height:10px"></div></div>',
  spacer: '<div class="ctr">' + svg('<path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/>') + '</div>',
}

interface PeekState {
  item: LibItem
  rect: DOMRect
  /** the card sits just outside the panel, over the canvas, so it never covers other tiles */
  left: number
}

let show: (p: PeekState | null) => void = () => {}
let timer: number | undefined
let open = false

/** Rest on a tile for a moment to peek; moving to the next tile while open peeks at once. */
export const peek = {
  enter(item: LibItem, el: HTMLElement) {
    window.clearTimeout(timer)
    const panel = el.closest('aside')?.getBoundingClientRect()
    timer = window.setTimeout(() => show({ item, rect: el.getBoundingClientRect(), left: (panel?.right ?? el.getBoundingClientRect().right) + 12 }), open ? 0 : 380)
  },
  leave() {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => show(null), 80)
  },
  hide() {
    window.clearTimeout(timer)
    show(null)
  },
}

export function PeekLayer() {
  const [p, setP] = useState<PeekState | null>(null)
  const [last, setLast] = useState<PeekState | null>(null)
  useEffect(() => {
    show = (x) => {
      open = !!x
      setP(x)
      if (x) setLast(x)
    }
    const away = () => show(null)
    window.addEventListener('scroll', away, true)
    window.addEventListener('dragstart', away, true)
    return () => {
      show = () => {}
      window.removeEventListener('scroll', away, true)
      window.removeEventListener('dragstart', away, true)
    }
  }, [])
  const cur = p ?? last
  if (!cur) return null
  const { item, rect, left } = cur
  const top = Math.max(8, Math.min(window.innerHeight - 196, rect.top + rect.height / 2 - 94))
  return createPortal(
    <div className="el-peek material" data-on={p ? '' : undefined} style={{ left, top }} aria-hidden>
      <div className="pv" dangerouslySetInnerHTML={{ __html: PV[item.id] ?? '' }} />
      <div className="mt-2 text-[13px] font-semibold text-[var(--t1)]">{item.label}</div>
      <div className="text-[12px] leading-[17px] text-[var(--t3)]">{HINT[item.id] ?? ''}</div>
    </div>,
    document.body,
  )
}
