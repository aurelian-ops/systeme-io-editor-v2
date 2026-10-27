import { ArrowDown, ArrowUp, ChevronDown, Menu as MenuIcon, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { el } from '../blocks'
import { cssColor } from '../theme'
import { font, lineHeight, padding } from '../render/css'
import { AlignRow, Color, ColorButton, FontType, G, LineHeight, Num, SizePosition, useAuto, useInspector } from '../settings/kit'
import { Button, Field, IconButton, NumberField, Segmented, TextField, Toggle, Tooltip, cx } from '../../ui/kit'
import type { MenuItem, Style, StyleKey } from '../types'
import type { ElementDef } from './types'

/** Navigation menu: links in a row; on mobile a menu button opens a dropdown panel. (A header's button is a plain Button element beside it, shown or hidden per device, like V1.) */
export const def: ElementDef = {
  type: 'menu',
  label: 'Menu',
  icon: MenuIcon,
  group: 'Other',
  make: () =>
    el(
      'menu',
      {
        menu: [
          { label: 'Home', href: '#' },
          { label: 'About', href: '#' },
          { label: 'Pricing', href: '#' },
          { label: 'Contact', href: '#' },
        ],
      },
      { fontSize: 16, gap: 32, textAlign: 'center' },
    ),
  render: ({ node, s, device, editable }) => <Menu id={node.id} items={node.props.menu ?? []} s={s} mobile={device === 'mobile'} burger={node.props.burger !== false} editable={editable} />,
  settings: () => <MenuSettings />,
}

/* ---------------- Which submenu the editor shows open: the item expanded in the settings ---------------- */

const shown = new Map<string, number | null>()
const subs = new Set<() => void>()
function showSub(id: string, i: number | null) {
  shown.set(id, i)
  subs.forEach((f) => f())
}
const useShownSub = (id: string) =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => void subs.delete(cb)),
    () => shown.get(id) ?? null,
  )
/** The submenu card and phone panel: a white card with dark text, readable on any page (changeable in Color). */
const SUB_BG = '#FFFFFF'
const SUB_TEXT = '#171717'

// the editor can show the phone menu open while you style it (Phone menu · In the editor)
const phoneOpen = new Map<string, boolean>()
const phoneSubs = new Set<() => void>()
function setPhoneOpen(id: string, v: boolean) {
  phoneOpen.set(id, v)
  phoneSubs.forEach((f) => f())
}
const usePhoneOpen = (id: string) =>
  useSyncExternalStore(
    (cb) => (phoneSubs.add(cb), () => void phoneSubs.delete(cb)),
    () => phoneOpen.get(id) ?? false,
  )

const hasSub = (it: MenuItem) => it.hasSub !== false && !!it.sub?.length

/* ---------------- Render ---------------- */

const CSS = `
.sio-mn-link{position:relative;color:var(--mn-color);text-decoration:none;transition:color 100ms var(--ease-out)}
.page-root a.sio-mn-link{color:var(--mn-color)}
.page-root a.sio-mn-link:hover,.page-root a.sio-mn-link[aria-current="page"],.sio-mn-item[data-open] a.sio-mn-link{color:var(--mn-active)}
.page-root a.sio-mn-row{display:flex;align-items:center;min-height:44px;padding:0 14px;border-radius:calc(var(--r) * .8);color:var(--mn-sub-text);text-decoration:none;transition:background-color 120ms var(--ease-out),color 120ms var(--ease-out)}
.page-root a.sio-mn-row:hover,.page-root a.sio-mn-row[aria-current="page"]{background:color-mix(in srgb,var(--mn-sub-text) 7%,transparent);color:var(--mn-sub-text)}
.sio-mn-burger{transition:background-color 120ms var(--ease-out),transform 120ms var(--ease-out)}
.sio-mn-burger:hover{background:color-mix(in srgb,var(--c-ink) 6%,transparent)}
.sio-mn-burger:active{transform:scale(.96)}
.sio-mn-panel{transform-origin:top;animation:sio-mn-in 180ms var(--ease-out) backwards}
.sio-mn-pill{transition:height 360ms var(--ease-spring),width 300ms var(--ease-spring),background-color 200ms var(--ease-out),box-shadow 200ms var(--ease-out)}
.sio-mn-pill[data-open]{background:var(--mn-panel);-webkit-backdrop-filter:blur(18px) saturate(180%);backdrop-filter:blur(18px) saturate(180%);box-shadow:0 0 0 1px var(--c-edge,var(--c-line)),0 10px 30px -14px rgba(0,0,0,.3)}
.sio-mn-list{opacity:0;visibility:hidden;transition:opacity 160ms var(--ease-out),visibility 0s 160ms}
.sio-mn-pill[data-open] .sio-mn-list{opacity:1;visibility:visible;transition:opacity 200ms var(--ease-out) 80ms}
.page-root .sio-mn-pill a.sio-mn-row{min-height:44px;padding:0 12px;border-radius:12px}
.page-root a.sio-mn-btn{transition:filter 120ms var(--ease-out)}.page-root a.sio-mn-btn:hover{filter:brightness(.94)}
.sio-mn-pill[data-open] .sio-mn-burger{color:var(--mn-sub-text)!important}
.sio-mn-ico{position:relative;width:20px;height:14px;display:block}
.sio-mn-ico i{position:absolute;left:0;right:0;height:1.75px;border-radius:2px;background:currentColor;transition:transform 260ms var(--ease-spring),top 260ms var(--ease-spring)}
.sio-mn-ico i:nth-child(1){top:2px}.sio-mn-ico i:nth-child(2){top:10px}
[aria-expanded="true"]>.sio-mn-ico i:nth-child(1){top:6px;transform:rotate(45deg)}
[aria-expanded="true"]>.sio-mn-ico i:nth-child(2){top:6px;transform:rotate(-45deg)}
@keyframes sio-mn-in{from{opacity:0;transform:translateY(-4px) scale(.98)}}
.sio-mn-item{position:relative;display:inline-flex}
.sio-mn-float nav{animation:sio-mn-in 160ms var(--ease-out) backwards}
.sio-mn-chev{transition:transform 160ms var(--ease-out)}
.sio-mn-item[data-open] .sio-mn-chev{transform:rotate(180deg)}
@media (prefers-reduced-motion: reduce){.sio-mn-panel,.sio-mn-float nav{animation:none}.sio-mn-pill,.sio-mn-list,.sio-mn-ico i{transition:none}}
`

const isCurrent = (href: string) => {
  if (!href || href === '#') return false
  try {
    const u = new URL(href, window.location.href)
    return u.origin === window.location.origin && u.pathname === window.location.pathname && u.hash === window.location.hash
  } catch {
    return false
  }
}

function Menu({ id, items, s, mobile: phone, burger, editable }: { id: string; items: MenuItem[]; s: Style; mobile: boolean; burger: boolean; editable: boolean }) {
  // a phone shows the menu button, unless the links are set to stay in a row
  const mobile = phone && burger
  const [openState, setOpen] = useState(false)
  const shownOpen = usePhoneOpen(id)
  const open = openState || (editable && mobile && shownOpen)
  // phones (Linear / Arc): the menu button's row grows down into a soft glass panel with the links
  const listRef = useRef<HTMLDivElement>(null)
  const [listH, setListH] = useState(0)
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const fit = () => setListH(el.scrollHeight)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mobile])
  // phones: which item's submenu is unfolded in the panel; the editor follows the item open in the settings
  const [unfold, setUnfold] = useState<number | null>(null)
  const asked = useShownSub(id)
  const subOpen = editable ? asked : unfold
  useEffect(() => {
    if (editable && mobile && asked !== null) setOpen(true)
  }, [editable, mobile, asked])
  // desktop submenu: open on hover / keyboard focus (a short delay to cross the gap), and in the editor while edited
  const [hovered, setHovered] = useState<number | null>(null)
  const closeT = useRef<number>(undefined)
  const enter = (i: number) => (window.clearTimeout(closeT.current), setHovered(i))
  const leave = () => (window.clearTimeout(closeT.current), (closeT.current = window.setTimeout(() => setHovered(null), 140)))
  useEffect(() => () => window.clearTimeout(closeT.current), [])
  const dropOpen = mobile ? null : editable ? (subOpen ?? hovered) : hovered
  // the phone menu panel in the editor may hang past the bottom of the phone frame
  const dropShown = editable && mobile && open ? -1 : null
  useLayoutEffect(() => {
    if (dropShown === null) return
    const frame = wrap.current?.closest<HTMLElement>('[data-page-frame]')
    if (!frame) return
    frame.dataset.floating = ''
    return () => void delete frame.dataset.floating
  }, [dropShown])
  const wrap = useRef<HTMLDivElement>(null)
  // phones: the open panel spans the header section it sits in (the menu's own column is narrow), 16px from each edge
  const [span, setSpan] = useState<{ right: number; width: number } | null>(null)
  useLayoutEffect(() => {
    if (!mobile || !open) return void setSpan(null)
    const el = wrap.current
    const sec = el?.closest<HTMLElement>('section')
    if (!el || !sec) return
    const fit = () => {
      const scale = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1
      const er = el.getBoundingClientRect()
      const sr = sec.getBoundingClientRect()
      const pad = parseFloat(getComputedStyle(el).paddingRight) || 0
      setSpan({ right: (er.right - sr.right) / scale + 16 - pad, width: Math.max(220, sr.width / scale - 32) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(sec)
    return () => ro.disconnect()
  }, [mobile, open])
  const align = s.textAlign ?? 'center'
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
  const fs = s.fontSize ?? 16

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as globalThis.Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('keydown', key)
    }
  }, [open])
  useEffect(() => {
    if (!mobile) setOpen(false)
  }, [mobile])

  const vars = {
    '--mn-color': cssColor(s.color) ?? 'var(--c-ink)',
    '--mn-active': cssColor(s.activeColor) ?? cssColor(s.color) ?? 'var(--c-primary)',
    '--mn-burger': cssColor(s.iconColor) ?? cssColor(s.color) ?? 'var(--c-ink)',
    // the submenu card and the phone panel have their own readable colours (a white card, dark text) unless set
    '--mn-panel': cssColor(s.contentBackground) ?? SUB_BG,
    '--mn-sub-text': cssColor(s.subtextColor) ?? SUB_TEXT,
    '--mn-btn': cssColor(s.buttonBackground) ?? 'var(--c-primary)',
    '--mn-btn-text': cssColor(s.buttonColor) ?? 'var(--c-on-primary)',
  } as CSSProperties
  // an item shown as a button (a header's call to action): after the links on desktop, at the bottom of the dropdown on phones
  const BTN: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mn-btn)', color: 'var(--mn-btn-text)', fontWeight: 600, borderRadius: 'calc(var(--r) * .8)', textDecoration: 'none', lineHeight: 1.2 }
  const firstLink = items.findIndex((x) => !x.button)
  const firstBtn = items.findIndex((x) => !!x.button)
  // a centred menu with a button: the links stay centred and the button goes to the right edge (the free space is shared)
  const spread = firstBtn >= 0 && firstLink >= 0 && align !== 'left' && align !== 'right'

  const link = (it: MenuItem, i: number, cls: string, style?: CSSProperties) => (
    <a
      key={i}
      className={cls}
      href={editable ? undefined : it.href || undefined}
      target={!editable && it.newWindow ? '_blank' : undefined}
      rel={!editable && it.newWindow ? 'noopener noreferrer' : undefined}
      aria-current={!editable && isCurrent(it.href) ? 'page' : undefined}
      onClick={(e) => {
        if (editable) e.preventDefault()
        else setOpen(false)
      }}
      style={{ cursor: 'pointer', ...style }}
    >
      {it.label}
    </a>
  )

  const panel: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 6,
    background: 'var(--mn-panel)',
    borderRadius: 'var(--r-card)',
    boxShadow: '0 0 0 1px var(--c-edge, var(--c-line)), 0 4px 8px -2px rgba(0,0,0,.08), 0 16px 32px -8px rgba(0,0,0,.16)',
    textAlign: 'left',
  }
  const chev = <ChevronDown size={Math.round(fs * 0.85)} strokeWidth={2} className="sio-mn-chev" style={{ flex: 'none', opacity: 0.7, color: 'var(--mn-color)' }} />

  const typo = font(s)
  delete typo.backgroundColor // the panel keeps its own background
  const text: CSSProperties = { fontSize: fs, lineHeight: lineHeight(s, 1.5), fontWeight: 500, ...typo }

  return (
    <div ref={wrap} data-sio-menu={id} style={{ ...vars, position: 'relative', padding: padding(s) }}>
      <style>{CSS}</style>
      {mobile ? (
        <div style={{ position: 'relative', height: 44 }}>
          <div
            className="sio-mn-pill"
            data-open={open ? '' : undefined}
            style={{
              position: 'absolute',
              top: 0,
              ...(open && span ? { right: span.right } : align === 'left' ? { left: 0 } : align === 'right' ? { right: 0 } : { left: 0, right: 0, marginInline: 'auto' }),
              width: open ? (span ? span.width : 'max(100%, 260px)') : 44,
              height: open ? 44 + listH : 44,
              zIndex: 40,
              overflow: 'hidden',
              borderRadius: 22,
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: align === 'left' ? 'flex-start' : 'flex-end' }}>
              <button
                type="button"
                className="sio-mn-burger"
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                style={{ all: 'unset', boxSizing: 'border-box', width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 22, color: 'var(--mn-burger)', cursor: 'pointer' }}
              >
                {/* two lines that turn into a cross */}
                <span className="sio-mn-ico" aria-hidden>
                  <i />
                  <i />
                </span>
              </button>
            </div>
            <div ref={listRef} className="sio-mn-list" style={{ ...text, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px 10px' }}>
              {items.map((it, i) =>
                it.button ? null : hasSub(it) ? (
                  // a submenu unfolds in place on phones (no hover there)
                  <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      className="sio-mn-row"
                      aria-expanded={subOpen === i}
                      tabIndex={open ? 0 : -1}
                      onClick={() => !editable && setUnfold(unfold === i ? null : i)}
                      style={{ all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, padding: '0 12px', borderRadius: 12, color: 'var(--mn-sub-text)', cursor: 'pointer' }}
                    >
                      {it.label}
                      <ChevronDown size={16} style={{ flex: 'none', opacity: 0.7, transform: subOpen === i ? 'rotate(180deg)' : undefined, transition: 'transform 220ms var(--ease-spring)' }} />
                    </button>
                    {subOpen === i && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 12 }}>
                        {it.sub!.map((x, k) => link(x, k, 'sio-mn-row', { fontSize: fs * 0.94, minHeight: 38, opacity: 0.75 }))}
                      </div>
                    )}
                  </div>
                ) : (
                  link(it, i, 'sio-mn-row')
                ),
              )}
              {/* the buttons close the dropdown, full width */}
              {items.map((it, i) => (it.button ? link(it, i, 'sio-mn-btn', { ...BTN, minHeight: 44, marginTop: 6, padding: '0 16px' }) : null))}
            </div>
          </div>
        </div>
      ) : (
        <nav aria-label="Menu" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: justify, alignItems: 'center', columnGap: s.gap ?? 32, rowGap: 8, ...text }}>
          {items.map((it, i) =>
            it.button ? (
              link(it, i, 'sio-mn-btn', { ...BTN, padding: '10px 18px', ...(spread && i === firstBtn ? { marginLeft: 'auto' } : {}) })
            ) : hasSub(it) ? (
              // desktop: the submenu opens under its item on hover or keyboard focus (and in the editor while you edit it)
              <span
                key={i}
                className="sio-mn-item"
                data-mi={i}
                data-open={dropOpen === i ? '' : undefined}
                onPointerEnter={() => enter(i)}
                onPointerLeave={leave}
                onFocus={() => enter(i)}
                onBlur={leave}
              >
                <span data-anchor style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {link(it, i, 'sio-mn-link', { paddingBlock: 4 })}
                  {chev}
                </span>
                {dropOpen === i && (
                  <FloatDrop from={wrap} index={i} editable={editable} onEnter={() => enter(i)} onLeave={leave}>
                    <nav aria-label={it.label} style={{ ...panel, ...text, fontSize: fs * 0.94 }}>
                      {it.sub!.map((x, k) => link(x, k, 'sio-mn-row'))}
                    </nav>
                  </FloatDrop>
                )}
              </span>
            ) : (
              link(it, i, 'sio-mn-link', { paddingBlock: 4, ...(spread && i === firstLink ? { marginLeft: 'auto' } : {}) })
            ),
          )}
        </nav>
      )}
    </div>
  )
}

/**
 * A submenu drawn above everything (a rounded section, the preview's frame or the editor's page can't cut it off),
 * placed under its item and scaled like the page it belongs to. It carries the page's colours and fonts along.
 * In the editor it stays under the editor's own panels and the Preview (which sits above the canvas).
 */
const CARRIED = ['--c-bg', '--c-ink', '--c-muted', '--c-line', '--c-edge', '--c-primary', '--c-surface', '--r', '--r-card', '--f-body', '--f-heading', '--mn-color', '--mn-active', '--mn-panel', '--mn-sub-text']
function FloatDrop({ from, index, editable, onEnter, onLeave, children }: { from: React.RefObject<HTMLDivElement | null>; index: number; editable: boolean; onEnter: () => void; onLeave: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [vars, setVars] = useState<CSSProperties>({})
  useLayoutEffect(() => {
    const wrapEl = from.current
    if (!wrapEl) return
    const cs = getComputedStyle(wrapEl)
    setVars(Object.fromEntries([...CARRIED.map((k) => [k, cs.getPropertyValue(k)]), ['fontFamily', cs.fontFamily]]) as CSSProperties)
    let raf = 0
    const place = () => {
      const anchor = wrapEl.querySelector<HTMLElement>(`[data-mi="${index}"] [data-anchor]`)
      const root = wrapEl.closest<HTMLElement>('.page-root')
      const el = box.current
      if (anchor && el) {
        const r = anchor.getBoundingClientRect()
        const z = root ? root.getBoundingClientRect().width / root.offsetWidth || 1 : 1
        // under its item, or above it when the screen has no room below (a footer menu)
        const h = el.offsetHeight * z
        const up = r.bottom + h > window.innerHeight - 8 && r.top - h > 8
        el.style.left = `${r.left + r.width / 2}px`
        el.style.top = `${up ? r.top - h : r.bottom}px`
        el.style.transformOrigin = up ? 'bottom center' : 'top center'
        // in the editor a little more room, so the card never covers the selection outline
        const gap = editable ? 14 : 8
        el.style.paddingTop = up ? '0' : `${gap}px`
        el.style.paddingBottom = up ? `${gap}px` : '0'
        el.style.transform = `translateX(-50%) scale(${z})`
      }
      raf = requestAnimationFrame(place)
    }
    place()
    return () => cancelAnimationFrame(raf)
  }, [from, index, editable])
  return createPortal(
    <div
      ref={box}
      className="page-root sio-mn-float"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{ ...vars, position: 'fixed', zIndex: editable ? 25 : 900, minWidth: 200, paddingTop: 8, background: 'transparent', transformOrigin: 'top center', pointerEvents: editable ? 'none' : undefined, textAlign: 'left' }}
    >
      {children}
    </div>,
    document.body,
  )
}

/* ---------------- Settings ---------------- */

function MenuSettings() {
  const { node, device } = useInspector()
  const hasBtn = (node.props.menu ?? []).some((x) => x.button)
  return (
    <>
      {device === 'mobile' && <PhoneMenu />}
      <MenuItems />
      <G title="Typography" keys={['fontFamily', 'fontSize', 'lineHeight', 'textAlign', 'letterSpacing']}>
        <FontType />
        <Num k="fontSize" label="Font size" min={10} max={40} fallback={16} />
        <LineHeight fallback={1.5} />
        <AlignRow />
        <Num k="letterSpacing" label="Letter spacing" min={0} max={20} step={0.5} fallback={0} floor={-Infinity} ceiling={Infinity} />
      </G>
      <G title="Color" keys={['color', 'activeColor', 'contentBackground', 'subtextColor', 'buttonBackground', 'buttonColor']}>
        <ColorLine k="color" label="Menu items text color" />
        <ColorLine k="activeColor" label="Hover and current item color" />
        {hasBtn && <Color k="buttonBackground" label="Button color" auto={{ token: 'primary', label: '' }} />}
        {hasBtn && <Color k="buttonColor" label="Button text color" auto={{ token: 'on-primary', label: '' }} />}
        <Color k="contentBackground" label="Submenu background" auto={{ hex: SUB_BG, token: 'bg', label: '' }} />
        <Color k="subtextColor" label="Submenu text color" auto={{ hex: SUB_TEXT, token: 'ink', label: '' }} />
      </G>
      <G title="Margin" keys={['gap']}>
        <StackNum k="gap" label="Spacing between menu items" max={96} fallback={32} />
      </G>
      <SizePosition />
    </>
  )
}

/** Phones (V1): the menu button on or off, its colour, the panel's colour, and showing it open in the editor. */
function PhoneMenu() {
  const { node, setProps } = useInspector()
  const burger = node.props.burger !== false
  const open = usePhoneOpen(node.id)
  useEffect(() => () => setPhoneOpen(node.id, false), [node.id])
  return (
    <G title="Phone menu" keys={['iconColor']}>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-[12px] text-[var(--t2)]">Show menu button</span>
        <Toggle checked={burger} onChange={(v) => setProps({ burger: v }, false)} />
      </label>
      {burger && (
        <>
          <Color k="iconColor" label="Menu button color" auto={{ token: 'ink', label: '' }} />
          <Field label="In the editor" stack>
            <Segmented
              full
              size="sm"
              value={open ? 'open' : 'closed'}
              onChange={(v) => setPhoneOpen(node.id, v === 'open')}
              options={[
                { value: 'closed', label: 'Closed' },
                { value: 'open', label: 'Open' },
              ]}
            />
          </Field>
        </>
      )}
    </G>
  )
}

/**
 * Menu items as one outline (Notion / Finder): sub links sit indented under their item, joined by a thin line. Click a
 * row to edit it right there; hovering a row shows + sub link, move and delete.
 */
type Path = [number] | [number, number]
const same = (a: Path | null, b: Path) => !!a && a.length === b.length && a[0] === b[0] && a[1] === b[1]

function MenuItems() {
  const { node, setProps } = useInspector()
  const items = node.props.menu ?? []
  const [sel, setSelRaw] = useState<Path | null>(null)
  // the canvas shows the submenu of the item (or sub link) open here
  const setSel = (p: Path | null) => {
    setSelRaw(p)
    showSub(node.id, p && items[p[0]] && hasSub(items[p[0]]) ? p[0] : null)
  }
  useEffect(() => () => showSub(node.id, null), [node.id])
  const put = (menu: MenuItem[], next: Path | null = sel, coalesce = false) => {
    setProps({ menu }, coalesce)
    setSelRaw(next)
    showSub(node.id, next && menu[next[0]] && hasSub(menu[next[0]]) ? next[0] : null)
  }
  const patch = (p: Path, v: Partial<MenuItem>, coalesce = true) =>
    put(
      items.map((it, i) => (i !== p[0] ? it : p.length === 1 ? { ...it, ...v } : { ...it, sub: (it.sub ?? []).map((x, k) => (k === p[1] ? { ...x, ...v } : x)) })),
      sel,
      coalesce,
    )
  const remove = (p: Path) =>
    put(
      p.length === 1 ? items.filter((_, i) => i !== p[0]) : items.map((it, i) => (i !== p[0] ? it : { ...it, sub: it.sub!.filter((_, k) => k !== p[1]), hasSub: it.sub!.length > 1 })),
      null,
    )
  const move = (p: Path, d: number) => {
    const list = p.length === 1 ? [...items] : [...items[p[0]].sub!]
    const i = p.length === 1 ? p[0] : p[1]
    const j = i + d
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    put(p.length === 1 ? list : items.map((it, k) => (k === p[0] ? { ...it, sub: list } : it)), p.length === 1 ? [j] : [p[0], j])
  }
  const addSub = (i: number) => {
    const sub = [...(items[i].sub ?? []), { label: `Sub link ${(items[i].sub?.length ?? 0) + 1}`, href: '#' }]
    put(items.map((it, k) => (k === i ? { ...it, sub, hasSub: true } : it)), [i, sub.length - 1])
  }

  const row = (it: MenuItem, p: Path) => {
    const on = same(sel, p)
    const child = p.length === 2
    const count = child ? items[p[0]].sub!.length : items.length
    const idx = child ? p[1] : p[0]
    return (
      <div key={p.join('.')}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={on}
          onClick={() => setSel(on ? null : p)}
          onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && setSel(on ? null : p)}
          className={cx(
            'group/row relative flex h-8 cursor-pointer items-center gap-1 rounded-[7px] pl-2 pr-0.5 outline-none hover:bg-[var(--fill-1)] focus-visible:bg-[var(--fill-1)]',
            child && 'ml-[22px]',
            on && '!bg-[var(--brand-tint)]',
          )}
        >
          {/* the thin line that joins a sub link to its item */}
          {child && <span aria-hidden className="absolute -left-[12px] bottom-1/2 top-[-6px] w-[9px] rounded-bl-[6px] border-b-[1.5px] border-l-[1.5px] border-[var(--line-2)]" />}
          <span className={cx('min-w-0 flex-1 truncate text-[13px]', on ? 'font-semibold text-[var(--brand-ink)]' : child ? 'text-[var(--t1)]' : 'font-medium text-[var(--t1)]', !it.label && 'text-[var(--t4)]')}>{it.label || 'Untitled'}</span>
          <span className={cx('flex flex-none items-center', on ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100')}>
            {!child && (
              <IconButton tip="Add sub link" className="h-6 w-6" onClick={(e) => (e.stopPropagation(), addSub(p[0]))}>
                <Plus size={13} />
              </IconButton>
            )}
            <IconButton tip="Move up" className="h-6 w-6" disabled={idx === 0} onClick={(e) => (e.stopPropagation(), move(p, -1))}>
              <ArrowUp size={13} />
            </IconButton>
            <IconButton tip="Move down" className="h-6 w-6" disabled={idx === count - 1} onClick={(e) => (e.stopPropagation(), move(p, 1))}>
              <ArrowDown size={13} />
            </IconButton>
            <IconButton tip={child ? 'Delete sub link' : 'Delete menu item'} className="h-6 w-6 hover:!text-[var(--dng)]" onClick={(e) => (e.stopPropagation(), remove(p))}>
              <Trash2 size={13} />
            </IconButton>
          </span>
        </div>
        {on && (
          <div className={cx('mb-2 mt-1 flex flex-col gap-2 rounded-[10px] bg-[var(--raised)] p-2.5 shadow-[var(--shadow-card)]', child && 'ml-[22px]')}>
            <Field label="Title" stack>
              <TextField value={it.label} onChange={(v) => patch(p, { label: v })} />
            </Field>
            <Field label="Link" stack>
              <TextField value={it.href} onChange={(v) => patch(p, { href: v })} placeholder="https://" />
            </Field>
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-[12px] text-[var(--t2)]">Open in a new window</span>
              <Toggle checked={!!it.newWindow} onChange={(v) => patch(p, { newWindow: v }, false)} />
            </label>
            {!child && (
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-[12px] text-[var(--t2)]">Show as button</span>
                <Toggle checked={!!it.button} onChange={(v) => patch(p, { button: v }, false)} />
              </label>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <G title="Menu items">
      <div className="flex flex-col gap-0.5">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {row(it, [i])}
            {(it.hasSub || it.sub?.length ? (it.sub ?? []) : []).map((x, k) => row(x, [i, k]))}
          </div>
        ))}
      </div>
      <Button size="sm" className="self-start" onClick={() => put([...items, { label: 'New link', href: '#' }], [items.length])}>
        <Plus size={13} /> Add menu item
      </Button>
    </G>
  )
}

/* Long V1 labels do not fit the 84px label column, so these rows give the label the room it needs. */

export function ColorLine({ k, label }: { k: StyleKey; label: string }) {
  const { s, state, set, reset } = useInspector()
  const auto = useAuto(k)
  const overridden = state(k) === 'override'
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <span className="text-[12px] leading-[16px] text-[var(--t3)]">{label}</span>
        {overridden && (
          <Tooltip label="Changed for this device. Click to reset">
            <button onClick={() => reset(k)} className="press group flex h-4 items-center rounded-[4px] px-1 text-[var(--brand-ink)] hover:bg-[var(--brand-tint)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] group-hover:hidden" />
              <RotateCcw size={11} className="hidden group-hover:block" />
            </button>
          </Tooltip>
        )}
      </div>
      <ColorButton value={s[k] as string | undefined} onChange={(v) => set(k, v as never)} auto={auto} />
    </div>
  )
}

export function StackNum({ k, label, min = 0, max = 100, step = 1, unit = 'px', fallback }: { k: StyleKey; label: string; min?: number; max?: number; step?: number; unit?: string; fallback?: number }) {
  const { s, state, set, reset } = useInspector()
  return (
    <Field label={label} stack state={state(k)} onReset={() => reset(k)}>
      <NumberField value={(s[k] as number | undefined) ?? fallback ?? min} onChange={(v) => set(k, v as never)} min={min} max={max} step={step} unit={unit} />
    </Field>
  )
}
