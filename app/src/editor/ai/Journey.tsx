import { useEffect, useMemo } from 'react'
import { Check, Circle } from 'lucide-react'
import { PageView } from '../render/PageView'
import { ensureFont } from '../fonts'
import { buildRecipe, type RecipeCopy, type RecipeKnobs } from '../recipes'
import { heroFamily } from '../recipeMeta'
import { getState, setState, update, useEditor } from '../store'
import { walk } from '../tree'
import type { Direction, PageDoc, Theme } from '../types'
import { Button, Spinner, Toggle, cx } from '../../ui/kit'
import { lookTheme, runAI, sanitizeTheme, stopAI, type ComposedPage } from './run'
import { setJourney, useJourney, useJourneyState } from './journeyState'

/**
 * A new page, in three calm steps on the canvas and in the left panel's place:
 * the four looks arrive one by one as artboards of the top of your page · you pick one and continue · the page
 * builds in front of you, then the list says it is ready. No outline to approve: what you don't want, you delete.
 */

const W = 1280

/** A photo still to be made: a soft two-tone surface in the look's own colours (never a grey block). */
const spot = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="16" height="10" fill="url(#g)"/></svg>`)}`

/** a colour part of the way from b to a (both #rrggbb) */
function mix(a: string, b: string, k: number) {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return '#e5e5e5'
  const [x, y] = [rgb(a), rgb(b)]
  return '#' + x.map((v, i) => Math.round(v * k + y[i] * (1 - k)).toString(16).padStart(2, '0')).join('')
}

function withSpots<T>(v: T, src: string, real?: { from: string; url: string }): T {
  if (typeof v === 'string') return (v.startsWith('img:') ? (real && real.from === v ? real.url : src) : v) as T
  if (Array.isArray(v)) return v.map((x) => withSpots(x, src, real)) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).map(([k, x]) => [k, withSpots(x, src, real)])) as T
  return v
}

type Section = ComposedPage['sections'][number]

/** The top of your page in each look: the header (if the page has one) and the first screen, with your real words. */
function usePreviews(dirs: Direction[]) {
  const { preview, heroPhoto } = useJourneyState()
  const page = useEditor((s) => s.doc.plan?.page as ComposedPage | undefined)
  const base = useEditor((s) => s.doc.theme)
  const brief = useEditor((s) => s.doc.brief)
  return useMemo(() => {
    const written: Section[] = page?.sections ?? preview ?? []
    const heroAt = written.findIndex((x) => x.recipe.startsWith('hero'))
    const top = heroAt >= 0 ? written.slice(0, heroAt + 1) : written.slice(0, 1)
    const first = top.find((x) => x.recipe.startsWith('hero'))
    return dirs.map((d) => {
      const theme = { ...base, ...sanitizeTheme(page?.theme ?? {}), ...lookTheme(d) } as Theme
      const own = first?.recipe ?? d.hero ?? 'hero-split'
      // a look's own first-screen layout, within the page kind's family (an opt-in keeps a form, an event its facts)
      const recipe = d.hero && (!first || heroFamily(d.hero) === heroFamily(own)) ? d.hero : own
      const dark = recipe === 'hero-fullbleed' || recipe === 'hero-optin-card'
      const src = dark ? spot(theme.dark ?? '#1c1c1c', mix(theme.primary, theme.dark ?? '#1c1c1c', 0.35)) : spot(mix(theme.primary, theme.bg, 0.16), mix(theme.ink, theme.bg, 0.12))
      const sections = top.map((sec) => {
        const isHero = sec.recipe.startsWith('hero')
        const copy: RecipeCopy = sec.copy
          ? withSpots(sec.copy as unknown as RecipeCopy, src, heroPhoto)
          : { eyebrow: brief?.offer ?? brief?.business ?? undefined, headline: d.sample ?? d.name, sub: brief?.desires?.[0], cta: 'Get started', photo: src }
        if (sec.recipe === 'header' || sec.recipe === 'footer') copy.logo = brief?.logo ?? copy.logo
        const knobs: RecipeKnobs = { ...((sec.knobs ?? {}) as RecipeKnobs), ...(isHero ? { size: 'big' as const, tone: 'light' as const } : {}) }
        const node = buildRecipe(isHero ? recipe : sec.recipe, copy, knobs, theme)
        walk([node], (n) => {
          delete n.props.motion
          if (typeof n.props.src === 'string' && n.props.src.startsWith('img:')) n.props.src = src
          for (const st of [n.style.desktop, n.style.mobile]) if (st?.backgroundImage?.startsWith('img:')) st.backgroundImage = src
        })
        return node
      })
      if (!sections.length) {
        const copy: RecipeCopy = { eyebrow: brief?.offer ?? brief?.business ?? undefined, headline: d.sample ?? d.name, sub: brief?.desires?.[0], cta: 'Get started', photo: src }
        const node = buildRecipe(recipe, copy, { size: 'big', tone: 'light' }, theme)
        walk([node], (n) => void delete n.props.motion)
        sections.push(node)
      }
      return { ...getState().doc, theme, sections } as PageDoc
    })
  }, [dirs, preview, heroPhoto, page, base, brief])
}

function Artboard({ doc, zoom, on, onPick }: { doc?: PageDoc; zoom: number; on: boolean; onPick?: () => void }) {
  return (
    <div
      onClick={onPick}
      className={cx('relative flex-none overflow-hidden', onPick && 'cursor-pointer')}
      style={{
        width: W,
        zoom,
        minHeight: 640,
        borderRadius: 10,
        background: doc?.theme.bg ?? 'var(--raised)',
        boxShadow: on ? `0 0 0 ${2 / zoom}px var(--brand), var(--shadow-frame)` : 'var(--shadow-frame)',
        transition: 'box-shadow 160ms var(--ease-out), background-color 300ms var(--ease-out)',
      }}
    >
      {doc ? (
        <div className="fade-in" style={{ pointerEvents: 'none' }}>
          <PageView doc={doc} device="desktop" editable={false} building={[]} />
        </div>
      ) : (
        // a look still being written: an empty board with one quiet pulse
        <div className="absolute inset-0 grid place-items-center">
          <div className="sio-skel" style={{ width: 120 / zoom, height: 4 / zoom, borderRadius: 999, opacity: 0.5 }} />
        </div>
      )}
    </div>
  )
}

/** The canvas while a new page is decided: four boards that fill as the looks arrive. */
export function JourneyStage({ z, avail }: { z: number; avail: number }) {
  const { phase, turn } = useJourney()
  const j = useJourneyState()
  const dirs = useMemo(() => (turn?.directions?.length ? turn.directions : j.looks.filter(Boolean)), [turn?.directions, j.looks])
  useEffect(() => dirs.forEach((d) => (ensureFont(d.fontHeading), ensureFont(d.fontBody))), [dirs])
  const docs = usePreviews(dirs)
  // two by two when each look can still be read (about 300px wide), else one under the other
  const two = (avail - 24) / 2 / W
  const cols = two * W >= 300 ? 2 : 1
  const zoom = cols === 2 ? two : Math.min(1, avail / W)
  void z
  const slots = Math.max(4, dirs.length)
  return (
    <div className="flex flex-col items-center gap-5 pb-28">
      <div className={cx('grid w-full justify-center gap-x-6 gap-y-8', cols === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {Array.from({ length: slots }, (_, i) => {
          const d = dirs[i]
          return (
            <div key={d ? d.name + i : `slot-${i}`} className="flex min-w-0 flex-col gap-2">
              <div className="flex h-6 items-center gap-2 px-0.5">
                {d ? (
                  <>
                    <button onClick={() => setJourney({ look: i })} className={cx('press truncate text-[12px] font-medium', j.look === i ? 'text-[var(--t1)]' : 'text-[var(--t3)] hover:text-[var(--t1)]')}>
                      {d.name}
                    </button>
                    {i === 0 && <Recommended />}
                  </>
                ) : (
                  <span className="text-[12px] text-[var(--t4)]">{phase === 'writing' || phase === 'looks' ? `Look ${i + 1}` : ''}</span>
                )}
              </div>
              <Artboard doc={docs[i]} zoom={zoom} on={!!d && j.look === i} onPick={d ? () => setJourney({ look: i }) : undefined} />
            </div>
          )
        })}
      </div>
      <div className="text-[12px] text-[var(--t3)]">The top of your page in each look. The rest of the page follows the one you pick.</div>
    </div>
  )
}

const Recommended = () => (
  <span className="inline-flex h-5 flex-none items-center rounded-[5px] bg-[var(--studio-tint)] px-1.5 text-[11.5px] font-medium text-[var(--studio)]">Recommended</span>
)

/* ---------------- The list in the left panel's place ---------------- */

function Head({ title, sub, icon }: { title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="px-4 pb-3 pt-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--t1)]">
        {icon}
        {title}
      </div>
      {sub && <div className="tnum mt-0.5 text-[12px] text-[var(--t3)]">{sub}</div>}
    </div>
  )
}

const Foot = ({ children }: { children: React.ReactNode }) => <div className="mt-auto flex flex-col gap-3 border-t border-[var(--line)] p-4">{children}</div>

/** The page the AI wrote while you chose, once it has arrived. */
const usePlan = () => useEditor((s) => (s.doc.plan?.page as ComposedPage | undefined)?.sections)

/** The list: what is happening, the looks to pick from, the build ticking through the sections, then "ready". */
export function JourneyList() {
  const { phase, turn } = useJourney()
  const j = useJourneyState()
  const plan = usePlan()
  const steps = turn?.steps ?? []
  const brief = useEditor((s) => s.doc.brief)
  const sections = useEditor((s) => s.doc.sections)
  const photosLeft = useEditor((s) => (s.doc.brief?.photos === 'ai' ? (JSON.stringify(s.doc.sections).match(/"(src|backgroundImage)":"img:/g) ?? []).length : 0))
  // the list sits in the left panel's place and moves with it: the panel's collapse button hides both
  const inset = useEditor((s) => s.leftInset)
  if (!phase) return null
  const dirs = turn?.directions?.length ? turn.directions : j.looks.filter(Boolean)
  const qs = turn?.questions ?? []
  const others = qs.filter((q) => q.id !== 'photos')
  const askPhotos = qs.some((q) => q.id === 'photos')
  const lookName = dirs[j.look]?.name ?? brief?.look?.name

  /** the look is picked: the page builds now (an answer that changes the words is applied to it right after) */
  const go = () => {
    const d = dirs[j.look]
    if (d) update((doc) => void (doc.brief = { ...doc.brief, look: d }), { label: 'Picked a look' })
    update((doc) => void (doc.brief = { ...doc.brief, photos: askPhotos ? j.photos : (doc.brief?.photos ?? 'ai') }), { label: 'Photos choice' })
    const answered = others.filter((q) => j.answers[q.id]?.trim())
    const answers = answered.map((q) => `${q.q} ${j.answers[q.id].trim()}`)
    void runAI({
      prompt: answers.length ? `${answers.join(' ')} Apply these answers to the page: change only the words they affect.` : `Use the look "${d?.name}" exactly. Go ahead.`,
      display: [`Look: ${d?.name}`, askPhotos ? `Photos: ${j.photos === 'ai' ? 'AI photos' : 'my own'}` : '', ...answered.map((q) => `${q.q.replace(/\?$/, '')}: ${j.answers[q.id].trim()}`)].filter(Boolean).join('\n'),
      mode: 'generate',
      planned: true,
      picks: !answers.length,
    })
  }

  return (
    // in the left panel's place (its size and corner), solid so the panel under it never shows through
    <div
      className="glass-sidebar pop-in fixed bottom-2 left-2 top-14 z-40 flex w-[284px] flex-col overflow-auto rounded-[16px]"
      style={{ background: 'var(--raised)', transform: inset < 300 ? `translateX(${inset - 300}px)` : undefined, visibility: inset <= 0 ? 'hidden' : undefined }}
    >
      {(phase === 'writing' || phase === 'looks') && (
        <>
          {/* the first screen's voice: its serif, the second line in italic blue */}
          <div className="px-5 pb-4 pt-6">
            <div className="font-['Instrument_Serif'] text-[30px] leading-[32px] tracking-[-0.01em] text-[var(--t1)]">
              {dirs.length ? 'Pick a look,' : 'Writing'}
              <br />
              <span className="italic text-[var(--studio)]">{dirs.length ? 'made for your page' : 'your page'}</span>
            </div>
            <p className="mt-2 text-[12px] leading-[18px] text-[var(--t3)]">{dirs.length ? 'Click one here or on the page. You can change it later.' : 'Reading your request, then the sections arrive one by one. About a minute.'}</p>
          </div>
          <div className="flex flex-col gap-1 px-2">
            {dirs.map((d, i) => {
              const on = j.look === i
              return (
                <button key={d.name + i} onClick={() => setJourney({ look: i })} className="press fade-in flex items-center gap-3 rounded-[12px] py-2 pl-2 pr-3 text-left hover:bg-[var(--fill-1)]">
                  {/* the look itself: its background, its heading font, its accent; picked = a ring round it */}
                  <span
                    className="relative grid h-11 w-11 flex-none place-items-center rounded-[12px] transition-shadow duration-[160ms]"
                    style={{ background: d.bg, color: d.ink, boxShadow: on ? '0 0 0 2px var(--raised), 0 0 0 4px var(--brand)' : 'inset 0 0 0 1px rgba(0,0,0,.06)' }}
                  >
                    <span style={{ fontFamily: `"${d.fontHeading}", serif`, fontSize: 21, fontWeight: 600, letterSpacing: '-0.01em' }}>Aa</span>
                    <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: d.accent }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('flex items-center gap-2 text-[13px] leading-[20px]', on ? 'font-semibold text-[var(--t1)]' : 'font-medium text-[var(--t2)]')}>
                      <span className="truncate">{d.name}</span>
                      {i === 0 && <Recommended />}
                    </span>
                    {d.feeling && <span className="block truncate text-[12px] leading-[18px] text-[var(--t3)]">{d.feeling}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {others.map((q) => (
            <div key={q.id} className="mt-3 flex flex-col gap-1.5 px-4">
              <div className="text-[12.5px] font-medium text-[var(--t1)]">{q.q}</div>
              {!q.options.length && (
                <input
                  value={j.answers[q.id] ?? ''}
                  onChange={(e) => setJourney((s) => ({ answers: { ...s.answers, [q.id]: e.target.value } }))}
                  onKeyDown={(e) => e.key === 'Enter' && dirs.length && go()}
                  placeholder="Type your answer"
                  className="h-8 w-full rounded-[7px] bg-[var(--fill-1)] px-2.5 text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]"
                />
              )}
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((o) => {
                  const on = j.answers[q.id] === o
                  return (
                    <button
                      key={o}
                      aria-pressed={on}
                      onClick={() => setJourney((s) => ({ answers: { ...s.answers, [q.id]: on ? '' : o } }))}
                      className={cx('press h-7 rounded-full px-3 text-[12.5px] transition-[background-color,color,box-shadow] duration-[120ms]', on ? 'bg-[var(--studio-tint)] font-medium text-[var(--studio)] shadow-[inset_0_0_0_1px_var(--studio)]' : 'bg-[var(--fill-1)] text-[var(--t2)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]')}
                    >
                      {o}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <Foot>
            {askPhotos && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] leading-[20px] text-[var(--t1)]">Create photos with AI</div>
                  <div className="text-[12px] leading-[18px] text-[var(--t3)]">{j.photos === 'ai' ? 'Made for this page, in this look' : 'Each spot says what photo goes there'}</div>
                </div>
                <Toggle checked={j.photos === 'ai'} onChange={(v) => setJourney({ photos: v ? 'ai' : 'own' })} label="Create photos with AI" />
              </div>
            )}
            {phase === 'looks' ? (
              <Button variant="primary" className="w-full" onClick={go}>
                Continue
              </Button>
            ) : (
              <Button variant="ghost" className="w-full" onClick={stopAI}>
                Stop
              </Button>
            )}
          </Foot>
        </>
      )}

      {phase === 'building' && <Building plan={plan} steps={steps} />}

      {phase === 'ready' && (
        <>
          <Head title="Your page is ready" icon={<Check size={15} className="text-[var(--ok)]" />} sub={`${sections.length} ${sections.length === 1 ? 'section' : 'sections'}${lookName ? ` · ${lookName}` : ''}`} />
          <div className="flex flex-col px-1.5">
            {sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  document.querySelector(`[data-node="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setState({ selectedId: s.id, editingId: null })
                }}
                className="press flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-left hover:bg-[var(--fill-1)]"
              >
                <Check size={14} className="flex-none text-[var(--t3)]" />
                <span className="truncate text-[13px] text-[var(--t1)]">{plan?.[i]?.name ?? (s.props.name as string | undefined) ?? 'Section'}</span>
              </button>
            ))}
          </div>
          {photosLeft > 0 && (
            <div className="mx-4 mt-2 flex items-center gap-2 text-[12px] text-[var(--t3)]">
              <Spinner size={12} /> Creating {photosLeft} {photosLeft === 1 ? 'photo' : 'photos'}. You can edit meanwhile.
            </div>
          )}
          <div className="mx-4 mt-3 text-[12px] leading-[18px] text-[var(--t3)]">Click anything on the page to change it, or ask in the chat on the right.</div>
          <Foot>
            <Button variant="primary" className="w-full" onClick={() => setJourney({ readyFor: undefined })}>
              Start editing
            </Button>
          </Foot>
        </>
      )}
    </div>
  )
}

/** The build ticking through the plan: done, being built, still to come; then the checks after it. */
function Building({ plan, steps }: { plan?: ComposedPage['sections']; steps: { text: string; done: boolean }[] }) {
  const rows = plan ?? []
  const said = (name: string) => steps.find((s) => s.text === name)
  const built = rows.filter((r) => said(r.name)).length
  const last = steps[steps.length - 1]
  const after = last && !rows.some((r) => r.name === last.text) && built === rows.length && rows.length > 0 ? last.text : null
  return (
    <>
      <Head
        title={rows.length ? (built < rows.length ? `Building ${Math.min(built + 1, rows.length)} of ${rows.length}` : 'Finishing') : 'Writing your page'}
        sub={rows.length ? undefined : 'The sections appear here as they are written'}
        icon={rows.length ? undefined : <Spinner size={13} />}
      />
      <div className="flex flex-col px-1.5 pb-1.5">
        {rows.map((r, i) => {
          const s = said(r.name)
          return (
            <div key={i} className="flex h-9 items-center gap-2.5 px-2.5">
              <span className="grid h-4 w-4 flex-none place-items-center">{s?.done ? <Check size={14} className="text-[var(--t1)]" /> : s ? <Spinner size={13} /> : <Circle size={12} className="text-[var(--t4)]" />}</span>
              <span className={cx('truncate text-[13px]', s ? 'text-[var(--t1)]' : 'text-[var(--t3)]')}>{r.name}</span>
            </div>
          )
        })}
        {after && (
          <div className="flex h-9 items-center gap-2.5 px-2.5 text-[13px] text-[var(--t2)]">
            <Spinner size={13} /> {after}
          </div>
        )}
      </div>
      <Foot>
        <Button variant="ghost" className="w-full" onClick={stopAI}>
          Stop
        </Button>
      </Foot>
    </>
  )
}
