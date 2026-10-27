import { useEffect, useState } from 'react'
import { getState } from '../store'
import { Studio } from './EmptyVariants'

/**
 * First screen of an empty page: one place to type, one way out.
 * The step type was already chosen when the funnel step was created, so it is only shown, not asked.
 * Motion follows what the user does: idle glow drifts, focus lights the ring, send sweeps once.
 */
export function EmptyState({ dropping = false }: { dropping?: boolean }) {
  return (
    <div className="relative h-full min-h-full">
      <Studio />
      {dropping && (
        <div className="fade-in pointer-events-none absolute inset-6 z-10 flex items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,transparent)] text-[14px] font-medium text-[var(--brand-ink)]">
          Drop it here to start the page
        </div>
      )}
    </div>
  )
}

/**
 * Placeholder page while the AI writes the first sections. It is shaped like a real page
 * (header, hero, three cards) so nothing jumps when content arrives, with one light sweeping across.
 */
export function BuildingSkeleton({ count }: { count: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 140)
    return () => window.clearTimeout(t)
  }, [])
  if (!shown || count <= 0) return null
  const shapes = [Hero, Cards, Split].slice(0, count)
  return (
    <div className="fade-in" aria-hidden>
      {shapes.map((Shape, i) => (
        <Shape key={i} delay={i * 160} />
      ))}
    </div>
  )
}

const Sk = ({ className, d = 0 }: { className: string; d?: number }) => <div className={'sio-skel ' + className} style={{ animationDelay: `${d}ms` }} />

function Hero({ delay }: { delay: number }) {
  return (
    <div className="px-[7%] pb-20 pt-8">
      <div className="mb-16 flex items-center justify-between">
        <Sk className="h-4 w-28 rounded-full" d={delay} />
        <Sk className="h-8 w-28 rounded-full" d={delay + 40} />
      </div>
      <div className="grid grid-cols-2 items-center gap-14">
        <div className="flex flex-col gap-4">
          <Sk className="h-3 w-24 rounded-full" d={delay + 60} />
          <Sk className="h-11 w-[92%] rounded-[12px]" d={delay + 80} />
          <Sk className="h-11 w-[70%] rounded-[12px]" d={delay + 100} />
          <Sk className="mt-2 h-4 w-[86%] rounded-full" d={delay + 120} />
          <Sk className="h-4 w-[64%] rounded-full" d={delay + 140} />
          <Sk className="mt-4 h-12 w-44 rounded-full" d={delay + 160} />
        </div>
        <Sk className="aspect-[1.1] w-full rounded-[22px]" d={delay + 120} />
      </div>
    </div>
  )
}

function Cards({ delay }: { delay: number }) {
  return (
    <div className="bg-[#fafbfc] px-[7%] py-20">
      <div className="mx-auto mb-12 flex max-w-[560px] flex-col items-center gap-3">
        <Sk className="h-3 w-24 rounded-full" d={delay} />
        <Sk className="h-9 w-full rounded-[12px]" d={delay + 40} />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[0, 1, 2].map((k) => (
          <div key={k} className="flex flex-col gap-3 rounded-[18px] bg-white p-6 shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
            <Sk className="h-9 w-9 rounded-[10px]" d={delay + 60 + k * 50} />
            <Sk className="mt-2 h-5 w-[70%] rounded-full" d={delay + 80 + k * 50} />
            <Sk className="h-3.5 w-full rounded-full" d={delay + 100 + k * 50} />
            <Sk className="h-3.5 w-[80%] rounded-full" d={delay + 120 + k * 50} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Split({ delay }: { delay: number }) {
  return (
    <div className="grid grid-cols-2 items-center gap-14 px-[7%] py-20">
      <Sk className="aspect-square w-full rounded-[22px]" d={delay} />
      <div className="flex flex-col gap-4">
        <Sk className="h-9 w-[80%] rounded-[12px]" d={delay + 40} />
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="flex items-center gap-3">
            <Sk className="h-5 w-5 rounded-full" d={delay + 60 + k * 40} />
            <Sk className="h-3.5 flex-1 rounded-full" d={delay + 70 + k * 40} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function isGenerating() {
  const s = getState()
  return s.aiBusy && !!s.pending && s.pending.base.sections.length === 0
}
