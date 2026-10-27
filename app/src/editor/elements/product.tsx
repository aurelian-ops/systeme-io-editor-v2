import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Info, Minus, Package, Plus } from 'lucide-react'
import { el, img } from '../blocks'
import { border, font, padding, radius, shadow } from '../render/css'
import { cssColor } from '../theme'
import { FadeImg } from '../render/PageView'
import { BorderGroup, Color, FontType, G, PFlag, ShadowRow, SizePosition } from '../settings/kit'
import type { Device, Node, Style } from '../types'
import type { ElementDef } from './types'

/** Default colours: dark text on a white box, readable whatever the page's theme or text colour. */
const P = { box: '#FFFFFF', name: '#171717', price: '#171717', text: '#5C6370', label: '#171717', accent: '#171717' }

/** Sample options: the real product and its options come from the funnel step settings. */
const OPTIONS: { name: string; values: string[] }[] = [
  { name: 'Size', values: ['Small', 'Medium', 'Large'] },
  { name: 'Color', values: ['Blue', 'Red', 'Green'] },
]

export const def: ElementDef = {
  type: 'product',
  label: 'Physical product',
  icon: Package,
  group: 'Payment',
  make: () =>
    el(
      'product',
      {
        name: 'Everyday canvas tote',
        price: '€39.00',
        text: 'Heavy cotton canvas, an inner pocket and long straps. Made to carry a laptop, a book and lunch.',
        src: img('canvas-tote', 600, 600),
        quantity: true,
      },
      { paddingY: 20, paddingX: 20 },
    ),
  render: ({ node, s, editable, device }) => <Product node={node} s={s} editable={editable} device={device} />,
  settings: () => (
    <>
      <G title="Product" keys={['fontFamily']}>
        <PFlag p="quantity" label="Display quantity" />
        <FontType />
      </G>
      <G title="Colors" keys={['titleColor', 'priceColor', 'color', 'subtextColor', 'accentColor']}>
        <Color k="titleColor" label="Product name" auto={{ hex: P.name, token: 'ink', label: '' }} />
        <Color k="priceColor" label="Price" auto={{ hex: P.price, token: 'ink', label: '' }} />
        <Color k="color" label="Description" auto={{ hex: P.text, token: 'ink', label: '' }} />
        <Color k="subtextColor" label="Labels and options" auto={{ hex: P.label, token: 'ink', label: '' }} />
        <Color k="accentColor" label="Selected option" auto={{ hex: P.accent, token: 'ink', label: '' }} />
      </G>
      <G title="Box" keys={['background', 'shadow']}>
        <Color k="background" label="Background color" auto={{ hex: P.box, token: 'bg', label: '' }} />
        <ShadowRow />
      </G>
      <BorderGroup />
      <SizePosition />
    </>
  ),
}

function Product({ node, s, editable, device }: { node: Node; s: Style; editable: boolean; device: Device }) {
  const p = node.props
  const [qty, setQty] = useState(1)
  const [picked, setPicked] = useState<Record<string, string>>(() => Object.fromEntries(OPTIONS.map((o) => [o.name, o.values[0]])))
  const [ref, width] = useWidth<HTMLDivElement>()
  const stacked = device === 'mobile' || (width > 0 && width < 440)
  const off: CSSProperties = editable ? { pointerEvents: 'none' } : {}
  return (
    <div
      ref={ref}
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          textAlign: 'left',
          fontFamily: 'var(--f-body)',
          ...font(s),
          // each part has its own colour (Colors in the settings), else the theme's
          // each part has its own colour (Colors in the settings), else a fixed dark set that reads on the light box
          '--p-name': cssColor(s.titleColor) ?? P.name,
          '--p-price': cssColor(s.priceColor) ?? P.price,
          '--p-text': cssColor(s.color) ?? P.text,
          '--p-label': cssColor(s.subtextColor) ?? P.label,
          '--p-accent': cssColor(s.accentColor) ?? P.accent,
          '--p-line': 'color-mix(in srgb, var(--p-label) 22%, transparent)',
        } as CSSProperties
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: stacked ? 'column' : 'row',
          gap: stacked ? 18 : 24,
          padding: padding(s) ?? 20,
          borderRadius: radius(s) ?? 'var(--r-card)',
          background: cssColor(s.background) ?? P.box,
          boxShadow: s.borderType !== undefined || s.shadow ? shadow(s.shadow) : '0 0 0 1px var(--c-edge), 0 1px 2px rgba(0,0,0,.04)',
          ...border(s),
          color: 'var(--c-ink)',
        }}
      >
        <div
          style={{
            flex: 'none',
            width: stacked ? '100%' : 'clamp(140px, 36%, 240px)',
            aspectRatio: stacked ? '3 / 2' : '1',
            alignSelf: 'flex-start',
            borderRadius: 'calc(var(--r-card) * 0.7)',
            overflow: 'hidden',
            background: 'var(--c-surface)',
          }}
        >
          <FadeImg src={p.src} alt={p.name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: s.fontFamily ? undefined : 'var(--f-heading)', fontWeight: 'var(--h-weight)' as unknown as number, letterSpacing: s.fontFamily ? undefined : 'var(--h-track)', fontSize: 22, lineHeight: 1.2, color: 'var(--p-name)' }}>{p.name}</span>
            <span style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--p-price)' }}>{p.price}</span>
          </div>
          {p.text ? <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--p-text)', textWrap: 'pretty' }}>{p.text}</p> : null}

          {OPTIONS.map((o) => (
            <div key={o.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={label}>
                {o.name}
                <span style={{ color: 'var(--p-text)', fontWeight: 400 }}> · {picked[o.name]}</span>
              </span>
              <div role="radiogroup" aria-label={o.name} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, ...off }}>
                {o.values.map((v) => {
                  const on = picked[o.name] === v
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={editable ? -1 : 0}
                      onClick={() => setPicked((x) => ({ ...x, [o.name]: v }))}
                      style={{
                        all: 'unset',
                        boxSizing: 'border-box',
                        height: 36,
                        padding: '0 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: 14,
                        fontWeight: on ? 600 : 500,
                        borderRadius: 'min(var(--r), 999px)',
                        cursor: 'pointer',
                        color: on ? 'var(--p-accent)' : 'var(--p-label)',
                        background: on ? 'color-mix(in srgb, var(--p-accent) 10%, transparent)' : 'transparent',
                        boxShadow: on ? 'inset 0 0 0 1.5px var(--p-accent)' : 'inset 0 0 0 1px var(--p-line)',
                        transitionProperty: 'color, background-color, box-shadow',
                        transitionDuration: '120ms',
                        transitionTimingFunction: 'var(--ease-out)',
                      }}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {p.quantity ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={label}>Quantity</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', height: 40, borderRadius: 'min(var(--r), 999px)', boxShadow: 'inset 0 0 0 1px var(--p-line)', ...off }}>
                <Step label="Decrease quantity" disabled={qty <= 1} editable={editable} onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus size={15} />
                </Step>
                <span aria-live="polite" style={{ minWidth: 32, textAlign: 'center', fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--p-label)' }}>
                  {qty}
                </span>
                <Step label="Increase quantity" disabled={qty >= 99} editable={editable} onClick={() => setQty((q) => Math.min(99, q + 1))}>
                  <Plus size={15} />
                </Step>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, lineHeight: 1.4, color: 'var(--c-muted)' }}>
        <Info size={14} style={{ flex: 'none', marginTop: 2 }} /> Sample product. Choose your product in the funnel step settings.
      </span>
    </div>
  )
}

/** Width of the element's own box, so the layout follows the column it sits in, not only the device. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

const label: CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--p-label)' }

function Step({ label, disabled, editable, onClick, children }: { label: string; disabled: boolean; editable: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      tabIndex={editable ? -1 : 0}
      onClick={onClick}
      style={{ all: 'unset', width: 40, height: 40, display: 'grid', placeItems: 'center', color: 'var(--p-label)', opacity: disabled ? 0.35 : 1, cursor: disabled ? 'default' : 'pointer' }}
    >
      {children}
    </button>
  )
}
