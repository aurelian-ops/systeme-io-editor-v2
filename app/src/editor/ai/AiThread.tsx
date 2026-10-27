import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Gauge, LayoutPanelTop, Palette, PenLine, X } from 'lucide-react'
import { setCompare, setState, update, useEditor, type AiTurn } from '../store'
import { ensureFont } from '../fonts'
import type { Direction } from '../types'
import { discardAI, keepAI, runAI } from './run'
import { Composer, useScope } from './Composer'
import { kindOf, suggestionsFor } from './suggest'
import { MemoryButton } from './Memory'
import { ChatListPanel, ChatsHeader, usePanelView } from './ChatsUI'
import { Button, IconButton, Segmented, Spinner, cx } from '../../ui/kit'

/**
 * The AI panel on the right of the canvas (modelled on Lovable / v0, kept quiet):
 * your requests, what the AI did in plain words, and Keep or Undo. No effects.
 */
export function AiThread() {
  const turns = useEditor((s) => s.aiTurns)
  const busy = useEditor((s) => s.aiBusy)
  const view = usePanelView()
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  return (
    <aside className="glass-sidebar pointer-events-auto m-2 flex h-[calc(100%-16px)] w-[324px] flex-none flex-col overflow-hidden rounded-[16px]">
      <ChatsHeader
        memory={<MemoryButton />}
        close={
          <IconButton tip="Close" kbd="⌘J" onClick={() => setState({ threadOpen: false })}>
            <X size={15} />
          </IconButton>
        }
      />
      {view === 'list' ? (
        <ChatListPanel />
      ) : (
        <>
      <div ref={list} className="scroll-thin scroll-edge flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 pt-1">
        {turns.length === 0 ? <Empty /> : turns.map((t, i) => <Turn key={t.id} t={t} last={i === turns.length - 1} />)}
      </div>
      <div className={cx('flex-none p-3', turns.length > 0 && 'border-t border-[var(--line)]')}>
        {!busy && turns.length > 0 && <Suggestions />}
        <Composer autoFocus />
      </div>
        </>
      )}
    </aside>
  )
}

/**
 * Before the first request: the first screen's voice carried into the panel (serif, Studio blue),
 * then ideas that fit what you are looking at.
 */
function Empty() {
  const { sel, label } = useScope()
  return (
    <div key={sel?.id ?? 'page'} className="v-rise mt-auto flex flex-col pt-6">
      <div className="font-['Instrument_Serif'] text-[34px] leading-[36px] tracking-[-0.01em] text-[var(--t1)]">
        What should we
        <br />
        <span className="italic text-[var(--studio)]">change today?</span>
      </div>
      <p className="mb-4 mt-2.5 text-[13px] leading-[19px] text-[var(--t3)]">
        {sel ? (
          <>
            Only <span className="font-medium text-[var(--t1)]">{label}</span> will change. You keep or undo it after.
          </>
        ) : (
          'Ask about the whole page, or pick something on it first. You keep or undo every change.'
        )}
      </p>
      <Suggestions big />
    </div>
  )
}

const KIND_ICON = { copy: PenLine, design: Palette, layout: LayoutPanelTop, check: Gauge }

function Suggestions({ big }: { big?: boolean }) {
  const { sel, selectedId } = useScope()
  const doc = useEditor((s) => s.doc)
  const lastWorking = useEditor((s) => s.aiTurns[s.aiTurns.length - 1]?.status === 'working')
  if (lastWorking) return null
  return (
    <div className={cx('flex flex-col gap-0.5', !big && 'mb-2')}>
      {suggestionsFor(doc, sel).map((s) => {
        const Icon = KIND_ICON[kindOf(s)]
        return (
          <button
            key={s.text}
            onClick={() =>
              s.check
                ? runAI({ prompt: s.text, mode: 'check' })
                : s.draft
                  ? window.dispatchEvent(new CustomEvent('editor:ai-draft', { detail: s.draft }))
                  : runAI({ prompt: s.text, scopeId: selectedId })
            }
            className={cx(
              'press flex items-center gap-2.5 rounded-[8px] text-left text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]',
              big ? 'min-h-9 px-2 py-1.5 text-[13px] leading-[18px]' : 'h-7 flex-none px-1.5 text-[12px]',
            )}
          >
            <span className={cx('flex flex-none items-center justify-center rounded-[7px] bg-[var(--studio-tint)] text-[var(--studio)]', big ? 'h-[26px] w-[26px]' : 'h-5 w-5 rounded-[5px]')}>
              <Icon size={big ? 14 : 12} strokeWidth={1.9} />
            </span>
            {/* above the message box each idea stays on one line (the full text shows on hover) */}
            <span className={cx('min-w-0 flex-1', !big && 'truncate')} title={big ? undefined : s.text}>
              {s.text}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Turn({ t, last }: { t: AiTurn; last: boolean }) {
  const pending = useEditor((s) => s.pending)
  const compare = useEditor((s) => s.compareBefore)
  const [open, setOpen] = useState(false)
  const working = t.status === 'working'
  const elapsed = useElapsed(working ? t.startedAt : undefined)
  const secs = t.endedAt ? Math.max(1, Math.round((t.endedAt - t.startedAt) / 1000)) : elapsed
  const current = t.steps[t.steps.length - 1]
  const showSteps = working || open

  return (
    <div className="fade-in flex flex-col gap-2.5">
      <div className="ml-10 self-end whitespace-pre-line rounded-[14px] bg-[var(--fill-1)] px-3 py-2 text-[13px] leading-[19px]">
        {t.images?.length ? (
          <div className="mb-1.5 flex flex-wrap justify-end gap-1">
            {t.images.map((u, i) => (
              <img key={i} src={u} alt="" className="h-16 w-16 rounded-[8px] object-cover shadow-[0_0_0_1px_var(--line-2)]" />
            ))}
          </div>
        ) : null}
        {t.prompt}
        <div className="mt-0.5 text-[11px] text-[var(--t3)]">{t.scope}</div>
      </div>

      <div className="text-[13px] leading-[19px]">
        {working ? (
          <div className="flex items-center gap-2 text-[var(--t2)]">
            <span className="text-[var(--t3)]">
              <Spinner size={13} />
            </span>
            <span className="min-w-0 flex-1 truncate">{current?.text ?? 'Reading your page'}</span>
            <span className="tnum text-[11px] text-[var(--t4)]">{secs}s</span>
          </div>
        ) : t.reply ? null : (
          <div className="text-[var(--t1)]">{summary(t)}</div>
        )}
        {t.score ? <ScoreCard t={t} /> : t.reply && <Reply text={t.reply} />}
        {t.directions?.length ? (
          // a new page: the looks are on the canvas and the choices in the outline on the left
          last && t.status === 'answered' ? <div className="mt-2 text-[12px] text-[var(--t3)]">Pick a look in the outline on the left. You can also type your answer here.</div> : null
        ) : t.questions?.length ? (
          <Questions t={t} last={last} />
        ) : null}

        {t.steps.length > 0 && !working && (
          <button onClick={() => setOpen((o) => !o)} className="press mt-1 flex items-center gap-1 text-[12px] text-[var(--t3)] hover:text-[var(--t1)]">
            <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 160ms var(--ease-out)' }} />
            {t.steps.length > 1 ? `${t.steps.length} steps · ` : ''}{secs}s
          </button>
        )}

        {showSteps && t.steps.length > (working ? 1 : 0) && (
          <ol className="mt-1.5 flex flex-col border-l border-[var(--line-2)] pl-3">
            {(working ? t.steps.slice(0, -1) : t.steps).map((s) => (
              <li key={s.id}>
                <button
                  disabled={!s.target}
                  onClick={() => s.target && (setState({ selectedId: s.target, editingId: null }), window.dispatchEvent(new CustomEvent('editor:reveal', { detail: s.target })))}
                  className={cx('block w-full truncate rounded-[4px] py-0.5 text-left text-[12px] text-[var(--t3)]', s.target && 'hover:text-[var(--t1)]')}
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ol>
        )}

        {last && t.status === 'done' && pending && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <Button size="sm" variant="primary" onClick={keepAI}>
              Keep
            </Button>
            <Button size="sm" variant="secondary" onClick={discardAI}>
              Undo
            </Button>
            <span className="flex-1" />
            <div className="w-[128px]">
              <Segmented
                full
                size="sm"
                value={compare ? 'before' : 'after'}
                onChange={(v) => setCompare(v === 'before')}
                options={[
                  { value: 'before', label: 'Before' },
                  { value: 'after', label: 'After' },
                ]}
              />
            </div>
          </div>
        )}
        {t.status === 'kept' && <div className="mt-1.5 text-[12px] text-[var(--t4)]">Kept</div>}
        {t.status === 'discarded' && <div className="mt-1.5 text-[12px] text-[var(--t4)]">Undone</div>}
      </div>
    </div>
  )
}

/**
 * The AI's questions before it builds: each with a few tailored answers to tap (one per question), then one button.
 * Anything left unanswered, the AI decides. Typing in the box below works too.
 */
function Questions({ t, last }: { t: AiTurn; last: boolean }) {
  const busy = useEditor((s) => s.aiBusy)
  const empty = useEditor((s) => !s.doc.sections.length)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [look, setLook] = useState<number | null>(null)
  const live = last && !busy
  const dirs = t.directions ?? []
  const qs = t.questions ?? []
  const send = () => {
    // the look you picked is applied exactly (fonts and colours); with none picked, the AI decides
    const chosen = look !== null ? dirs[look] : undefined
    if (chosen) update((d) => void (d.brief = { ...d.brief, look: chosen }), { label: 'Picked a look' })
    // the photos question is the user's own choice for this page: kept as it is (AI photos, or theirs)
    // left unanswered ("decide for me"): the AI creates them
    const photos = qs.some((q) => q.id === 'photos') ? (picked.photos || 'ai') : ''
    if (photos) update((d) => void (d.brief = { ...d.brief, photos: /own|my own|mine/i.test(photos) ? 'own' : 'ai' }), { label: 'Photos choice' })
    const answers = qs.filter((q) => picked[q.id]).map((q) => `${q.q} ${picked[q.id]}`)
    runAI({
      prompt: `${chosen ? `Use the look "${chosen.name}" exactly. ` : ''}${answers.join(' ')}${answers.length ? ' ' : ''}${answers.length < qs.length ? 'Decide the rest yourself. ' : ''}Go ahead.`,
      // the answers as you would say them ("Look: Calm Studio · Photos: create them with AI")
      display: [chosen ? `Look: ${chosen.name}` : '', ...qs.filter((q) => picked[q.id]).map((q) => `${q.id === 'photos' ? 'Photos' : q.q.replace(/\?$/, '')}: ${picked[q.id]}`)].filter(Boolean).join('\n') || 'Decide for me',
      mode: empty ? 'generate' : 'edit',
      planned: true,
      picks: qs.filter((q) => picked[q.id]).every((q) => q.id === 'photos'),
    })
  }
  return (
    <div className={cx('mt-2.5 flex flex-col gap-3', !live && 'pointer-events-none opacity-60')}>
      {dirs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[12.5px] font-medium leading-[18px] text-[var(--t1)]">Pick a look for your page</div>
          <div className="grid grid-cols-2 gap-1.5">
            {dirs.map((d, i) => (
              <LookCard key={i} d={d} on={look === i} onPick={() => setLook(look === i ? null : i)} headline={d.sample ?? d.name} />
            ))}
          </div>
        </div>
      )}
      {qs.map((q) => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <div className="text-[12.5px] font-medium leading-[18px] text-[var(--t1)]">{q.q}</div>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((o) => {
              const on = picked[q.id] === o
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => ({ ...p, [q.id]: on ? '' : o }))}
                  className={cx(
                    'press h-7 rounded-full px-3 text-[12.5px] transition-[background-color,color,box-shadow] duration-[120ms]',
                    on ? 'bg-[var(--studio-tint)] font-medium text-[var(--studio)] shadow-[inset_0_0_0_1px_var(--studio)]' : 'bg-[var(--fill-1)] text-[var(--t2)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]',
                  )}
                >
                  {o}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {live && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={send}>
            {empty ? 'Build my page' : 'Continue'}
          </Button>
          <span className="text-[11.5px] text-[var(--t3)]">Or type your own answer below</span>
        </div>
      )}
    </div>
  )
}

/**
 * The conversion check: the score in plain words, one sentence on the biggest strength and weakness, then the
 * three fixes that would raise conversion most, each applied by the AI with one click.
 */
function ScoreCard({ t }: { t: AiTurn }) {
  const busy = useEditor((s) => s.aiBusy)
  const [done, setDone] = useState<number[]>([])
  const { score, summary, fixes } = t.score!
  const verdict = score >= 85 ? 'Strong' : score >= 70 ? 'Good, with room to grow' : score >= 50 ? 'Could convert much better' : 'Needs work before it can sell'
  return (
    <div className="mt-1 flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="tnum text-[28px] font-semibold leading-[32px] tracking-[-0.02em] text-[var(--t1)]">{score}</span>
        <span className="text-[12px] text-[var(--t3)]">/ 100 · {verdict}</span>
      </div>
      {/* a thin bar, filled to the score */}
      <div className="h-1 overflow-hidden rounded-full bg-[var(--fill-2)]">
        <div className="h-full rounded-full bg-[var(--t1)]" style={{ width: `${score}%`, transition: 'width 600ms var(--ease-out)' }} />
      </div>
      {summary && <p className="text-[13px] leading-[20px] text-[var(--t1)]">{summary}</p>}
      {fixes.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[11.5px] font-medium text-[var(--t3)]">The {fixes.length === 1 ? 'fix' : `${fixes.length} fixes`} that matter most</div>
          {fixes.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-[10px] bg-[var(--fill-1)] px-2.5 py-2">
              <span className="tnum mt-px w-3 flex-none text-[12px] font-medium text-[var(--t3)]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium leading-[18px] text-[var(--t1)]">{f.title}</div>
                <div className="text-[12px] leading-[17px] text-[var(--t3)]">{f.why}</div>
              </div>
              <Button
                size="sm"
                variant={done.includes(i) ? 'ghost' : 'secondary'}
                disabled={busy || done.includes(i)}
                onClick={() => (setDone((d) => [...d, i]), runAI({ prompt: f.prompt, display: f.title }))}
              >
                {done.includes(i) ? 'Done' : 'Fix'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** One look, drawn as a tiny first screen in its own fonts and colours (never a list of swatches). */
function LookCard({ d, on, onPick, headline }: { d: Direction; on: boolean; onPick: () => void; headline: string }) {
  useEffect(() => {
    ensureFont(d.fontHeading)
    ensureFont(d.fontBody)
  }, [d.fontHeading, d.fontBody])
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      title={d.why}
      className={cx('press flex flex-col overflow-hidden rounded-[10px] text-left transition-shadow duration-[120ms]', on ? 'shadow-[0_0_0_2px_var(--studio)]' : 'shadow-[0_0_0_1px_var(--line-2)] hover:shadow-[0_0_0_1px_var(--t4)]')}
    >
      <span className="flex h-[92px] flex-col justify-between p-2.5" style={{ background: d.bg, color: d.ink }}>
        <span style={{ fontFamily: `"${d.fontHeading}", serif`, fontSize: 15, lineHeight: 1.08, fontWeight: 600 }} className="line-clamp-3">
          {headline}
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ background: d.accent, color: d.onAccent ?? '#fff', borderRadius: Math.min(d.radius ?? 8, 999), fontFamily: `"${d.fontBody}", sans-serif` }} className="px-2 py-[3px] text-[9.5px] font-semibold">
            Get started
          </span>
        </span>
      </span>
      <span className="bg-[var(--raised)] px-2 py-1.5">
        <span className="block truncate text-[12px] font-medium text-[var(--t1)]">{d.name}</span>
        <span className="block truncate text-[11px] text-[var(--t3)]">{d.feeling ?? `${d.fontHeading} · ${d.fontBody}`}</span>
      </span>
    </button>
  )
}

/** The assistant's words: plain paragraphs and "- " bullets, nothing fancy. */
function Reply({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="mt-1 flex flex-col gap-2 text-[13px] leading-[20px] text-[var(--t1)]">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        if (lines.every((l) => /^\s*[-•]\s/.test(l)))
          return (
            <ul key={i} className="flex flex-col gap-1 pl-4">
              {lines.map((l, j) => (
                <li key={j} className="list-disc marker:text-[var(--t4)]">
                  {l.replace(/^\s*[-•]\s/, '')}
                </li>
              ))}
            </ul>
          )
        return (
          <p key={i} className="whitespace-pre-line">
            {b}
          </p>
        )
      })}
    </div>
  )
}

function summary(t: AiTurn) {
  if (t.status === 'empty') return t.note ?? 'I could not find what to change for that. Click the part you mean and ask there, or tell me the section.'
  if (t.status === 'stopped') return 'Stopped.'
  if (t.scope === 'New page') return `Your page is ready: ${t.steps.filter((s) => s.target).length} sections. Change anything by hand or ask here.`
  return `Done: ${t.changes} ${t.changes === 1 ? 'change' : 'changes'}.`
}

function useElapsed(from?: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!from) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [from])
  return from ? Math.max(0, Math.round((now - from) / 1000)) : 0
}
