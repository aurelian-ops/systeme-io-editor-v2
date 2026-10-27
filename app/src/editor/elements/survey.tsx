import { ArrowRight, Check, ListChecks } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { el, surveyFinal } from '../blocks'
import { cssColor } from '../theme'
import { box, font, radius } from '../render/css'
import { BorderGroup, FontType, G, PChoice, PText, ShadowRow, SizePosition, useInspector } from '../settings/kit'
import { useEditor } from '../store'
import { Button, Field, Segmented, Select } from '../../ui/kit'
import type { Node, Style, SurveyQuestion } from '../types'
import { ColorLine, StackNum } from './menu'
import { InfoNote } from './input'
import { SurveyEditor, toAnswer } from './SurveyEditor'
import type { ElementDef } from './types'

/** Survey: one question at a time; answering moves on, the last answer runs the chosen action. */
export const def: ElementDef = {
  type: 'survey',
  label: 'Survey',
  icon: ListChecks,
  group: 'Social',
  make: () =>
    el(
      'survey',
      {
        questions: [
          { title: 'What brings you here today?', subtitle: 'Pick the answer that fits best.', answers: ['I am just starting out', 'I want to grow what I have', 'I am looking for a specific tool'] },
          { title: 'How much time can you give it each week?', subtitle: '', answers: ['Less than 2 hours', '2 to 5 hours', 'More than 5 hours'] },
        ],
        finalText: 'Thank you. Your answers have been saved.',
        action: 'none',
      },
      { paddingY: 32, paddingX: 32, borderType: 'full' },
      [surveyFinal()],
    ),
  render: ({ node, s, editable, children }) => <Survey node={node} s={s} editable={editable} final={children()} />,
  settings: () => <SurveySettings />,
}

/* ---------------- Which tab the inspector shows, so the canvas can show the final step ---------------- */

const finalTab = new Set<string>()
const subs = new Set<() => void>()
const setFinalTab = (id: string, on: boolean) => {
  if (on) finalTab.add(id)
  else finalTab.delete(id)
  subs.forEach((f) => f())
}
const useFinalTab = (id: string) =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => finalTab.has(id),
  )

/* ---------------- Render ---------------- */

const CSS = `
.sio-sv-ans{transition:background-color 120ms var(--ease-out),box-shadow 120ms var(--ease-out),transform 120ms var(--ease-out)}
.sio-sv-ans:hover,.sio-sv-ans:focus-visible{background:var(--sv-hover)!important}
.sio-sv-ans:active{transform:scale(.99)}
.sio-sv-step{animation:sio-sv-in 260ms var(--ease-out) backwards}
.sio-sv-bar>i{transition:width 360ms var(--ease-spring)}
@keyframes sio-sv-in{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion: reduce){.sio-sv-step{animation:none}.sio-sv-bar>i{transition:none}}
@media (hover: none){.sio-sv-keys{display:none}}
`

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function Survey({ node, s, editable, final }: { node: Node; s: Style; editable: boolean; final: ReactNode }) {
  const p = node.props
  const questions = p.questions ?? []
  const showFinalTab = useFinalTab(node.id)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  // after the final step's form is sent: the thank-you line
  const [sent, setSent] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (step >= questions.length) setStep(Math.max(0, questions.length - 1))
  }, [step, questions.length])

  const accent = cssColor(s.iconColor) ?? 'var(--c-primary)'
  const vars = {
    '--sv-accent': accent,
    '--sv-outline': cssColor(s.outlineColor) ?? accent,
    '--sv-fill': cssColor(s.answerBackground) ?? `color-mix(in srgb, ${accent} 7%, transparent)`,
    '--sv-hover': cssColor(s.answerBackground) ?? `color-mix(in srgb, ${accent} 13%, transparent)`,
  } as CSSProperties
  const finalShown = editable ? showFinalTab : done
  const q: SurveyQuestion | undefined = questions[Math.min(step, questions.length - 1)]

  // an open answer waits for the visitor to type their own words, then Continue moves on
  const [typing, setTyping] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const next = () => {
    setPicked(null)
    setTyping(null)
    setTyped('')
    if (step < questions.length - 1) return setStep(step + 1)
    const action = p.action ?? 'none'
    if (action === 'url' && p.url) window.location.assign(p.url)
    else if (action === 'popup') {
      window.dispatchEvent(new CustomEvent('sio:action', { detail: { action: 'popup', popupId: p.popupId } }))
      setStep(0)
    } else setDone(true)
  }
  const answer = (i: number) => {
    if (editable || (picked !== null && typing === null)) return
    setPicked(i)
    if (q && toAnswer(q.answers[i]).open) return setTyping(i)
    setTyping(null)
    timer.current = window.setTimeout(next, 280)
  }

  const titleStyle: CSSProperties = {
    fontFamily: s.fontFamily ? undefined : 'var(--f-heading)',
    fontWeight: 'var(--h-weight)' as unknown as number,
    letterSpacing: s.fontFamily ? undefined : 'var(--h-track)',
    fontSize: s.fontSize ?? 24,
    lineHeight: 1.25,
    color: cssColor(s.color) ?? 'var(--c-heading, var(--c-ink))',
    textWrap: 'balance',
    margin: 0,
  }

  // like Typeform, a letter key picks that answer (live page, while this survey is on screen and nothing is typed)
  const rootRef = useRef<HTMLDivElement>(null)
  const answerRef = useRef(answer)
  answerRef.current = answer
  const keyable = !editable && !finalShown && !!q && typing === null
  useEffect(() => {
    if (!keyable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement as HTMLElement | null)?.tagName ?? '')) return
      const i = LETTERS.indexOf(e.key.toUpperCase())
      const r = rootRef.current?.getBoundingClientRect()
      if (i < 0 || !q || i >= q.answers.length || !r || r.bottom < 0 || r.top > window.innerHeight) return
      answerRef.current(i)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyable, q])

  return (
    <div
      ref={rootRef}
      style={{
        ...font(s),
        ...vars,
        background: 'var(--c-bg)',
        ...box(s, { pad: [32, 32] }),
        borderRadius: radius(s) ?? 'var(--r-card)',
        boxSizing: 'border-box',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <style>{CSS}</style>
      {/* Typeform's focus: a thin progress line, then one question at a time */}
      {questions.length > 0 && (
        <div className="sio-sv-bar" style={{ height: 3, borderRadius: 999, background: 'color-mix(in srgb, var(--c-ink) 12%, transparent)', marginBottom: 28, overflow: 'hidden' }}>
          <i style={{ display: 'block', height: '100%', borderRadius: 999, background: accent, width: `${((finalShown ? questions.length : step) + 1) / (questions.length + 1) * 100}%` }} />
        </div>
      )}
      {finalShown && !sent && node.children?.length ? (
        // the final step: real elements (Email, First name, a button) in a row; sending it shows the thank-you line
        <form
          key="final-form"
          className="sio-sv-step"
          noValidate={editable}
          onSubmit={(e) => {
            e.preventDefault()
            if (!editable) setSent(true)
          }}
          style={{ textAlign: 'left' }}
        >
          {final}
        </form>
      ) : finalShown ? (
        <div key="final" className="sio-sv-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
          <span style={{ width: 44, height: 44, borderRadius: 999, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}>
            <Check size={22} strokeWidth={2.4} />
          </span>
          <p style={{ ...titleStyle, whiteSpace: 'pre-line' }}>{p.finalText || 'Thank you for your answers.'}</p>
        </div>
      ) : q ? (
        <div key={step} className="sio-sv-step" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: accent, fontWeight: 600, fontSize: 14 }}>
              {step + 1}
              <ArrowRight size={14} strokeWidth={2.2} />
            </span>
            <h3 style={titleStyle}>{q.title}</h3>
            {q.subtitle ? <p style={{ fontSize: s.subtextSize ?? 16, lineHeight: 1.5, color: cssColor(s.subtextColor) ?? 'var(--c-muted)', margin: 0 }}>{q.subtitle}</p> : null}
          </div>
          <div role="radiogroup" aria-label={q.title} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 460 }}>
            {q.answers.map((a, i) => {
              const on = picked === i
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={editable ? -1 : 0}
                  className="sio-sv-ans"
                  onClick={() => answer(i)}
                  style={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    minHeight: 48,
                    padding: '10px 12px',
                    borderRadius: 'min(var(--r), 12px)',
                    background: on ? `color-mix(in srgb, ${accent} 16%, transparent)` : 'var(--sv-fill)',
                    boxShadow: on ? 'inset 0 0 0 2px var(--sv-outline)' : 'inset 0 0 0 1px color-mix(in srgb, var(--sv-outline) 40%, transparent)',
                    color: cssColor(s.answerColor) ?? 'var(--c-ink)',
                    fontSize: s.answerSize ?? 16,
                    lineHeight: 1.4,
                    fontWeight: 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {/* the letter: the key that picks it */}
                  <span
                    style={{
                      flex: 'none',
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      background: on ? accent : 'var(--c-bg)',
                      color: on ? 'var(--c-on-primary)' : accent,
                      boxShadow: on ? undefined : `inset 0 0 0 1px color-mix(in srgb, ${accent} 50%, transparent)`,
                      transition: 'background-color 120ms var(--ease-out), color 120ms var(--ease-out)',
                    }}
                  >
                    {LETTERS[i] ?? i + 1}
                  </span>
                  <span style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>{toAnswer(a).text}</span>
                  <Check size={16} strokeWidth={2.4} style={{ flex: 'none', color: accent, opacity: on ? 1 : 0, transition: 'opacity 120ms var(--ease-out)' }} />
                </button>
              )
            })}
            {typing === null && q.answers.length > 1 && (
              <span className="sio-sv-keys" style={{ marginTop: 6, fontSize: 12.5, color: 'var(--c-muted)' }}>
                Press {q.answers.slice(0, 3).map((_, i) => LETTERS[i]).join(', ').replace(/, ([^,]*)$/, ' or $1')}
              </span>
            )}
            {typing !== null && !editable && (
              <div className="sio-sv-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
                {/* an open answer is written in a text area (several lines), then Continue moves on */}
                <textarea
                  autoFocus
                  rows={3}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && typed.trim() && next()}
                  placeholder="Type your answer"
                  aria-label="Your answer"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 96, padding: '12px 14px', borderRadius: 'var(--r)', border: 0, outline: 'none', resize: 'vertical', boxShadow: 'inset 0 0 0 1.5px var(--sv-outline)', background: 'var(--c-bg)', color: 'var(--c-ink)', font: 'inherit', fontSize: s.answerSize ?? 16, lineHeight: 1.5 }}
                />
                <button
                  type="button"
                  disabled={!typed.trim()}
                  onClick={next}
                  style={{ all: 'unset', flex: 'none', height: 44, padding: '0 20px', borderRadius: 'var(--r)', background: accent, color: 'var(--c-on-primary)', fontWeight: 600, cursor: typed.trim() ? 'pointer' : 'default', opacity: typed.trim() ? 1 : 0.5 }}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      ) : editable ? (
        <p style={{ fontSize: 14, color: 'var(--c-muted)', margin: 0 }}>Add a question in the settings</p>
      ) : null}
    </div>
  )
}

/* ---------------- Settings ---------------- */

function SurveySettings() {
  const { node } = useInspector()
  const [tab, setTab] = useState<'survey' | 'final'>(() => (finalTab.has(node.id) ? 'final' : 'survey'))
  useEffect(() => {
    setFinalTab(node.id, tab === 'final')
  }, [node.id, tab])
  useEffect(() => () => setFinalTab(node.id, false), [node.id])
  return (
    <>
      <div className="px-4 pb-1 pt-1">
        <Segmented
          full
          value={tab}
          onChange={setTab}
          options={[
            { value: 'survey', label: 'Survey' },
            { value: 'final', label: 'Final step' },
          ]}
        />
      </div>
      {tab === 'survey' ? (
        <>
          <G title="Survey" keys={['fontFamily', 'iconColor']}>
            <QuestionsEditor />
            <ActionPicker />
            <FontType />
            <ColorLine k="iconColor" label="Color" />
          </G>
          <G title="Question" keys={['fontSize', 'subtextSize', 'color', 'subtextColor']}>
            <StackNum k="fontSize" label="Question title font size" min={12} max={64} fallback={24} />
            <StackNum k="subtextSize" label="Question subtitle font size" min={10} max={40} fallback={16} />
            <ColorLine k="color" label="Question title color" />
            <ColorLine k="subtextColor" label="Question subtitle color" />
          </G>
          <G title="Answer" keys={['answerSize', 'answerColor', 'answerBackground', 'outlineColor']}>
            <StackNum k="answerSize" label="Answer font size" min={10} max={40} fallback={16} />
            <ColorLine k="answerColor" label="Answer color" />
            <ColorLine k="answerBackground" label="Answer background color" />
            <ColorLine k="outlineColor" label="Answer outline color" />
          </G>
        </>
      ) : (
        <G title="Final step">
          <InfoNote>The fields and the button are elements: click one on the page to edit it, or drag elements in and out.</InfoNote>
          <PText p="finalText" label="Thank-you text (after it is sent)" multiline placeholder="Thank you for your answers." />
        </G>
      )}
      <BorderGroup />
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <SizePosition />
    </>
  )
}

function ActionPicker() {
  const { node, setProps } = useInspector()
  const popups = useEditor((st) => st.doc.popups) ?? []
  const action = node.props.action ?? 'none'
  return (
    <>
      <PChoice
        p="action"
        label="Choose an action"
        stack
        options={[
          { value: 'url', label: 'Redirect' },
          { value: 'popup', label: 'Open a popup' },
          { value: 'none', label: 'Display final step' },
        ]}
      />
      {action === 'url' && <PText p="url" label="URL" placeholder="https://" />}
      {action === 'popup' && (
        <Field label="Popup" stack>
          <Select
            value={node.props.popupId ?? ''}
            onChange={(v) => setProps({ popupId: v }, false)}
            options={[{ value: '', label: popups.length ? 'Select a popup' : 'No popups yet. Create one in Popups' }, ...popups.map((x) => ({ value: x.id, label: x.name }))]}
          />
        </Field>
      )}
    </>
  )
}

/** The questions are written in a modal (V1); the panel shows how many there are and opens it. */
function QuestionsEditor() {
  const { node, setProps } = useInspector()
  const qs = node.props.questions ?? []
  const [open, setOpen] = useState(false)
  return (
    <Field label="Survey questions" stack>
      <div className="flex w-full items-center justify-between gap-2">
        <span className="tnum text-[12px] text-[var(--t3)]">{qs.length ? `${qs.length} ${qs.length === 1 ? 'question' : 'questions'}` : 'No questions yet'}</span>
        <Button size="sm" onClick={() => setOpen(true)}>
          <ListChecks size={13} /> Edit survey
        </Button>
      </div>
      {open && <SurveyEditor questions={qs} onClose={() => setOpen(false)} onSave={(questions) => (setProps({ questions }, false), setOpen(false))} />}
    </Field>
  )
}
