import { CodeEditor, CodeNotes, codeProblems } from '../settings/CodeEditor'
import type { EditorView } from '@codemirror/view'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, ChevronLeft, Code2, MessageSquareText, Upload, X } from 'lucide-react'
import { setState, update, useEditor } from '../store'
import { runAI } from '../ai/run'
import { THEMES } from '../theme'
import type { Align, PageSettings, Theme } from '../types'
import { ColorButton, FontMenu, UploadModal } from '../settings/kit'
import { ensureFont } from '../fonts'
import { Button, Field, Group, IconButton, NumberField, Scrim, Segmented, Select, TextField, Toggle } from '../../ui/kit'

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'de', label: 'German' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'tr', label: 'Turkish' },
  { value: 'zh', label: 'Chinese' },
  { value: 'sv', label: 'Swedish' },
  { value: 'ro', label: 'Romanian' },
  { value: 'cs', label: 'Czech' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'da', label: 'Danish' },
  { value: 'id', label: 'Indonesian' },
  { value: 'pl', label: 'Polish' },
  { value: 'el', label: 'Greek' },
  { value: 'sr', label: 'Serbian' },
  { value: 'hi', label: 'Hindi' },
  { value: 'no', label: 'Norwegian' },
  { value: 'th', label: 'Thai' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'sq', label: 'Albanian' },
]

const FB_EVENTS = ['None', 'PageView', 'Lead', 'CompleteRegistration', 'Purchase', 'AddToCart', 'InitiateCheckout', 'ViewContent'].map((v) => ({ value: v, label: v }))

export function defaultSettings(): PageSettings {
  return {
    fontSize: 17,
    lineHeight: 1.6,
    align: 'left',
    language: 'en',
    backgroundBlur: 0,
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    seoAuthor: '',
    noIndex: false,
    fbEvent: 'None',
    headerCode: '',
    footerCode: '',
    affiliateBadge: false,
  }
}

export function SettingsPanel() {
  const doc = useEditor((s) => s.doc)
  const t = doc.theme
  const ps = { ...defaultSettings(), ...doc.settings }
  const [code, setCode] = useState<null | 'headerCode' | 'footerCode'>(null)
  const busy = useEditor((st) => st.aiBusy)

  const setTheme = (patch: Partial<Theme>, coalesce = true) =>
    update((d) => void Object.assign(d.theme, patch, patch.preset ? {} : { preset: 'Custom' }), coalesce ? { coalesce: `theme:${Object.keys(patch).join()}` } : {})
  const setS = (patch: Partial<PageSettings>, coalesce = true) =>
    update(
      (d) => {
        d.settings = { ...defaultSettings(), ...d.settings, ...patch }
      },
      coalesce ? { coalesce: `settings:${Object.keys(patch).join()}` } : {},
    )
  // page colours are written as plain css: theme tokens become the theme's current value
  const tokens: Record<string, string> = { ink: t.ink, muted: t.muted, primary: t.primary, 'on-primary': t.onPrimary, bg: t.bg, surface: t.surface }
  const raw = (v: string | undefined) => (v ? (tokens[v] ?? v) : undefined)
  const presetFont = (k: 'fontHeading' | 'fontBody') => THEMES.find((p) => p.preset === t.preset)?.[k] ?? THEMES[0][k]
  const lhPx = Math.round(ps.lineHeight * ps.fontSize)

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Settings" />
      <div className="scroll-thin scroll-edge min-h-0 flex-1 overflow-y-auto pb-10">
        <Group title="Default typography">
          <Field label="Default font">
            <FontPick value={t.fontBody} onPick={(f) => setTheme({ fontBody: f ?? presetFont('fontBody') }, false)} />
          </Field>
          <Field label="Font size">
            <NumberField value={ps.fontSize} onChange={(v) => setS({ fontSize: Math.max(10, v) })} min={10} max={32} unit="px" />
          </Field>
          <Field label="Line height">
            <NumberField value={lhPx} onChange={(v) => setS({ lineHeight: Math.round((Math.max(8, v) / ps.fontSize) * 100) / 100 })} min={Math.round(ps.fontSize)} max={Math.round(ps.fontSize * 2.6)} unit="px" />
          </Field>
          <Row label="Color of links">
            <ColorButton value={ps.linkColor} onChange={(v) => setS({ linkColor: raw(v) }, false)} auto={{ token: 'primary', label: '' }} />
          </Row>
          <Row label="Text color">
            <ColorButton value={ps.textColor} onChange={(v) => setS({ textColor: raw(v) }, false)} auto={{ token: 'ink', label: '' }} />
          </Row>
          <Field label="Alignment">
            <AlignPick value={doc.settings?.align} onChange={(v) => setS({ align: v }, false)} />
          </Field>
        </Group>

        <Group title="Heading typography">
          <Field label="Font type">
            <FontPick value={t.fontHeading} onPick={(f) => setTheme({ fontHeading: f ?? presetFont('fontHeading') }, false)} />
          </Field>
          <Row label="Text color">
            <ColorButton value={ps.headingColor} onChange={(v) => setS({ headingColor: raw(v) }, false)} auto={{ token: 'ink', label: '' }} />
          </Row>
          <Field label="Alignment">
            <AlignPick value={ps.headingAlign} onChange={(v) => setS({ headingAlign: v }, false)} />
          </Field>
        </Group>

        <Group title="Language" defaultOpen={false}>
          <Field label="Choose language" stack>
            <Select value={ps.language} onChange={(v) => setS({ language: v }, false)} options={LANGUAGES} />
          </Field>
        </Group>

        <Group title="Background">
          <Row label="Background color">
            <ColorButton value={ps.background} onChange={(v) => setS({ background: raw(v) }, false)} auto={{ token: 'bg', label: '' }} />
          </Row>
          <ImageRow label="Background image" value={ps.backgroundImage} onChange={(v) => setS({ backgroundImage: v }, false)} />
          {ps.backgroundImage && (
            <Field label="Blur">
              <NumberField value={ps.backgroundBlur} onChange={(v) => setS({ backgroundBlur: v })} max={20} unit="px" />
            </Field>
          )}
        </Group>

        <Group title="Search Engine Optimization (SEO)" defaultOpen={false}>
          <Button
            size="sm"
            className="self-start"
            disabled={busy || !doc.sections.length}
            onClick={() =>
              runAI({
                prompt: 'Write the SEO title, meta description and keywords for this page from its content. Use only the seo operation, do not change the page.',
                display: 'Write my SEO title, description and keywords',
                label: 'AI wrote the SEO settings',
              })
            }
          >
            <MessageSquareText size={13} />
            Write with AI
          </Button>
          <Field label="Title" stack>
            <TextField value={ps.seoTitle} placeholder={doc.title} onChange={(v) => setS({ seoTitle: v })} />
          </Field>
          <Field label="Description" stack>
            <TextField multiline value={ps.seoDescription} placeholder="One or two sentences shown under the title in search results" onChange={(v) => setS({ seoDescription: v })} />
          </Field>
          <Field label="Keywords" stack>
            <TextField value={ps.seoKeywords} placeholder="coaching, online course, free guide" onChange={(v) => setS({ seoKeywords: v })} />
          </Field>
          <Field label="Author" stack>
            <TextField value={ps.seoAuthor} onChange={(v) => setS({ seoAuthor: v })} />
          </Field>
          <ImageRow label="Social media image" value={ps.socialImage} onChange={(v) => setS({ socialImage: v }, false)} />
          <Row label="Hide from search engines">
            <Toggle checked={ps.noIndex} onChange={(v) => setS({ noIndex: v }, false)} label="Hide from search engines" />
          </Row>
        </Group>

        <Group title="Tracking" defaultOpen={false}>
          <Field label="Select Facebook event" stack>
            <Select value={ps.fbEvent} onChange={(v) => setS({ fbEvent: v }, false)} options={FB_EVENTS} />
          </Field>
          <CodeButton label="Edit header code" value={ps.headerCode} onClick={() => setCode('headerCode')} />
          <CodeButton label="Edit footer code" value={ps.footerCode} onClick={() => setCode('footerCode')} />
        </Group>

        <Group title="Affiliation" defaultOpen={false}>
          <Row label="Display an affiliate badge to earn lifetime commissions">
            <Toggle checked={ps.affiliateBadge} onChange={(v) => setS({ affiliateBadge: v }, false)} label="Display an affiliate badge" />
            <Toggle checked={ps.animations !== false} onChange={(v) => setS({ animations: v }, false)} label="Animations on the live page" />
            <Toggle checked={doc.brief?.photos !== 'own'} onChange={(v) => update((d) => void (d.brief = { ...d.brief, photos: v ? 'ai' : 'own' }), { label: 'Photos choice' })} label="AI creates the photos it plans" />
          </Row>
        </Group>
      </div>

      {code && (
        <CodeDialog
          title={code === 'headerCode' ? 'Header code' : 'Footer code'}
          where={code === 'headerCode' ? 'at the end of the page head' : 'just before the end of the page body'}
          value={ps[code]}
          onClose={() => setCode(null)}
          onSave={(v) => {
            setS({ [code]: v }, false)
            setCode(null)
          }}
        />
      )}
    </div>
  )
}

/* ---------------- Small building blocks shared by the page panels ---------------- */

export function PanelHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="edge-head flex items-center justify-between px-3 py-3">
      <div className="flex min-w-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => setState({ panel: null })} className="pl-1.5">
          <ChevronLeft size={14} />
          Back
        </Button>
        <span className="truncate text-[13px] font-semibold">{title}</span>
      </div>
      {right}
    </div>
  )
}

/** Label on the left (wraps when long), one compact control on the right. */
export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <span className="min-w-0 text-[12px] leading-[17px] text-[var(--t3)]">
        {label}
        {hint ? <span className="block text-[11px] leading-[16px] text-[var(--t4)]">{hint}</span> : null}
      </span>
      <span className="flex flex-none items-center">{children}</span>
    </div>
  )
}

/** Centred dialog in the same family as the image upload modal. Esc and the backdrop close it. */
export function Dialog({ title, children, actions, onClose, width = 420 }: { title: string; children: ReactNode; actions: ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [onClose])
  return (
    <Scrim onClose={onClose} className="p-4">
      <div role="dialog" aria-label={title} className="pop-in w-full rounded-[14px] bg-[var(--raised)] shadow-[var(--shadow-pop)]" style={{ maxWidth: width }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="pt-1 text-[15px] font-semibold leading-[20px]">{title}</div>
          <IconButton tip="Close" onClick={onClose} className="-mr-2">
            <X size={15} />
          </IconButton>
        </div>
        <div className="px-5 pb-1 pt-1.5 text-[13px] leading-[20px] text-[var(--t2)]">{children}</div>
        <div className="flex justify-end gap-1.5 px-5 pb-4 pt-4">{actions}</div>
      </div>
    </Scrim>
  )
}

function FontPick({ value, onPick }: { value: string; onPick: (f: string | undefined) => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => ensureFont(value), [value])
  return (
    <>
      <button ref={btn} onClick={() => setOpen((o) => !o)} className="press flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-[6px] bg-[var(--fill-1)] px-2.5 text-left text-[13px] text-[var(--t1)] hover:bg-[var(--fill-2)]">
        <span className="truncate" style={{ fontFamily: value }}>
          {value}
        </span>
        <ChevronDown size={14} className="flex-none text-[var(--t3)]" />
      </button>
      {open && btn.current && (
        <FontMenu
          anchor={btn.current}
          value={value}
          onClose={() => setOpen(false)}
          onPick={(f) => {
            ensureFont(f)
            onPick(f)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function AlignPick({ value, onChange }: { value: Align | undefined; onChange: (v: Align) => void }) {
  return (
    <Segmented
      full
      size="sm"
      value={value ?? 'left'}
      onChange={onChange}
      options={[
        { value: 'left', icon: <AlignLeft size={14} />, tip: 'Left' },
        { value: 'center', icon: <AlignCenter size={14} />, tip: 'Center' },
        { value: 'right', icon: <AlignRight size={14} />, tip: 'Right' },
      ]}
    />
  )
}

function ImageRow({ label, value, onChange }: { label: string; value?: string; onChange: (v: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Field label={label} stack>
      <div className="flex w-full items-center gap-2">
        <button onClick={() => setOpen(true)} aria-label={`Choose ${label.toLowerCase()}`} className="press relative flex h-12 w-16 flex-none items-center justify-center overflow-hidden rounded-[6px] bg-[var(--fill-1)] shadow-[var(--shadow-card)]">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Upload size={14} className="text-[var(--t3)]" />}
        </button>
        <div className="flex flex-1 flex-col items-start gap-1">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Upload size={13} /> {value ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <button onClick={() => onChange(undefined)} className="press text-[11px] text-[var(--t3)] hover:text-[var(--dng)]">
              Remove
            </button>
          )}
        </div>
      </div>
      {open && <UploadModal onClose={() => setOpen(false)} onInsert={(v) => (onChange(v), setOpen(false))} />}
    </Field>
  )
}

function CodeButton({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  const lines = value.trim() ? value.trim().split('\n').length : 0
  return (
    <Button onClick={onClick} className="w-full !justify-between">
      <span className="flex items-center gap-1.5">
        <Code2 size={14} className="text-[var(--t3)]" />
        {label}
      </span>
      <span className="tnum text-[12px] font-normal text-[var(--t4)]">{lines ? `${lines} ${lines === 1 ? 'line' : 'lines'}` : 'Empty'}</span>
    </Button>
  )
}

function CodeDialog({ title, where, value, onClose, onSave }: { title: string; where: string; value: string; onClose: () => void; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const ref = useRef(draft)
  ref.current = draft
  const place = title.startsWith('Header') ? 'head' : 'footer'
  const viewRef = useRef<EditorView | null>(null)
  const [, ready] = useState(0)
  const problems = codeProblems(draft, place)
  const blocking = problems.some((p) => p.severity === 'error')
  const save = () => !codeProblems(ref.current, place).some((p) => p.severity === 'error') && onSave(ref.current)
  return (
    <Dialog
      title={title}
      width={640}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" disabled={blocking} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <p className="mb-2.5 text-[12px] leading-[18px] text-[var(--t3)]">Paste tracking or verification code. It runs {where} on the live page, not in the editor or the preview.</p>
      <div data-escape-own className="flex h-[280px] overflow-hidden rounded-[10px] bg-[var(--raised)] shadow-[inset_0_0_0_1px_var(--line-2)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]">
        <CodeEditor value={value} onChange={setDraft} onSave={save} place={place} onView={(v) => ((viewRef.current = v), ready((n) => n + 1))} />
      </div>
      <div className="-mx-4">
        <CodeNotes problems={problems} getView={() => viewRef.current} place={place} />
      </div>
    </Dialog>
  )
}
