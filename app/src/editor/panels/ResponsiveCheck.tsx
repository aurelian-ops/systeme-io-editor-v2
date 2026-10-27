import { useMemo, useState } from 'react'
import { CheckCircle2, Smartphone, Tablet } from 'lucide-react'
import { applyFix, audit, type Issue } from '../check'
import { setState, toast, update, useEditor } from '../store'
import { Button, Popover, Segmented } from '../../ui/kit'
import type { Device } from '../types'

export function useIssues() {
  const doc = useEditor((s) => s.doc)
  return useMemo(() => audit(doc), [doc])
}

export function ResponsiveCheck({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }) {
  const issues = useIssues()
  const smart = useEditor((s) => s.doc.smartResponsive)
  const [dev, setDev] = useState<Device>(() => (issues.some((i) => i.device === 'mobile') || !issues.length ? 'mobile' : 'tablet'))
  const list = issues.filter((i) => i.device === dev)
  const count = (d: Device) => issues.filter((i) => i.device === d).length

  const show = (i: Issue) => {
    setState((s) => ({ view: s.view === 'all' ? 'all' : i.device, focusDevice: i.device, selectedId: i.nodeId, editingId: null, panel: null }))
    window.dispatchEvent(new CustomEvent('editor:reveal', { detail: i.nodeId }))
  }
  const fix = (items: Issue[]) => {
    update((d) => items.forEach((i) => applyFix(d, i)))
    toast(items.length === 1 ? 'Fixed' : `Fixed ${items.length} issues`, true)
  }

  return (
    <Popover anchor={anchor} onClose={onClose} align="end" width={380}>
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <div>
          <div className="text-[13px] font-semibold">Responsive check</div>
          <div className="text-[12px] text-[var(--t3)]">{smart ? 'Smart layout is on' : 'Smart layout is off'}</div>
        </div>
        <div className="w-[170px]">
          <Segmented
            full
            size="sm"
            value={dev}
            onChange={setDev}
            options={[
              { value: 'tablet', icon: <Tablet size={13} />, label: `${count('tablet')}` },
              { value: 'mobile', icon: <Smartphone size={13} />, label: `${count('mobile')}` },
            ]}
          />
        </div>
      </div>
      <div className="scroll-thin max-h-[52vh] overflow-auto px-1.5 pb-1.5">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <CheckCircle2 size={22} className="text-[var(--ok)]" />
            <div className="text-[13px] font-medium">Looks good on {dev}</div>
            <p className="text-[12px] leading-[18px] text-[var(--t3)]">Readable text, comfortable tap targets, and columns with room to breathe.</p>
          </div>
        ) : (
          list.map((i) => (
            <div key={i.id} className="group flex items-start gap-2.5 rounded-[8px] px-2 py-2 hover:bg-[var(--fill-1)]">
              <span className="mt-[6px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--warn)]" />
              <button className="min-w-0 flex-1 text-left" onClick={() => show(i)}>
                <div className="text-[13px] font-medium">{i.title}</div>
                <div className="text-[12px] leading-[17px] text-[var(--t3)]">{i.detail}</div>
              </button>
              <Button size="sm" onClick={() => fix([i])}>
                Fix
              </Button>
            </div>
          ))
        )}
      </div>
      {issues.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-3 py-2.5">
          <span className="text-[12px] text-[var(--t3)]">Fixes change only {issues.length > list.length ? 'tablet and mobile' : dev}. Desktop stays as it is.</span>
          <Button size="sm" variant="primary" onClick={() => fix(issues)}>
            Fix all {issues.length}
          </Button>
        </div>
      )}
    </Popover>
  )
}
