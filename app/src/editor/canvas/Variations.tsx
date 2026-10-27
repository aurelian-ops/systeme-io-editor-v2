import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { Popover } from '../../ui/kit'
import { variationsFor } from '../ai/extract'
import { alternativesFor } from '../recipes'
import { PageView } from '../render/PageView'
import { cloneFresh } from '../blocks'
import { activeDevice, getState, setState, toast, update, useEditor } from '../store'
import { find } from '../tree'
import { DEVICE_WIDTH } from '../types'

/** Real previews of the section in other layouts, with the user's own words and brand. */
export function VariationsPopover({ sectionId, anchor, onClose }: { sectionId: string; anchor: HTMLElement; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)
  const section = find(doc, sectionId)
  // a designed (recipe) section: its other layouts and tones, with its own words and photos; older sections: templates
  const options = useMemo(() => (section ? (section.props.recipe ? alternativesFor(section, doc.theme) : variationsFor(section)) : []), [section])
  if (!section) return null
  const device = activeDevice()
  const w = DEVICE_WIDTH[device]
  const thumbW = 300
  const z = thumbW / w

  const apply = (i: number) => {
    const fresh = cloneFresh(options[i].node)
    fresh.props.tone = options[i].node.props.tone
    update((d) => {
      const idx = d.sections.findIndex((s) => s.id === sectionId)
      if (idx >= 0) d.sections.splice(idx, 1, fresh)
    })
    setState({ selectedId: fresh.id })
    toast(`Switched to “${options[i].label}”`, true)
    onClose()
  }

  return (
    <Popover anchor={anchor} onClose={onClose} align="end" width={thumbW + 24}>
      <div className="p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[12px] font-semibold">Other versions</span>
          <span className="text-[11px] text-[var(--t3)]">Your words and photos stay</span>
        </div>
        <div className="scroll-thin flex max-h-[60vh] flex-col gap-2.5 overflow-auto">
          {options.map((o, i) => {
            const current = !section.props.recipe && isCurrent(section, i)
            return (
              <div key={i} role="button" tabIndex={0} onClick={() => apply(i)} onKeyDown={(e) => e.key === 'Enter' && apply(i)} className="press group cursor-pointer text-left">
                <div
                  className="relative overflow-hidden rounded-[8px] bg-white shadow-[var(--shadow-card)] group-hover:shadow-[0_0_0_2px_var(--brand)]"
                  style={{ height: 150, transition: 'box-shadow 120ms var(--ease-out)' }}
                >
                  <div style={{ width: w, zoom: z, pointerEvents: 'none' }}>
                    <PageView doc={getState().doc} device={device} only={[o.node]} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--t2)]">
                  {current ? <Check size={13} className="text-[var(--brand)]" /> : null}
                  {o.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Popover>
  )
}

function isCurrent(section: ReturnType<typeof find>, i: number) {
  if (!section) return false
  const first = section.children?.[0]
  const isRow = first?.type === 'row' && (first.children?.length ?? 0) > 1
  if (section.props.kind === 'hero') {
    if (i === 0) return !isRow
    const hasForm = JSON.stringify(section).includes('"type":"form"')
    return isRow && (i === 2 ? hasForm : !hasForm)
  }
  return false
}
