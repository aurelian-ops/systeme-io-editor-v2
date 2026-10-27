import { useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  Clock3,
  Columns3,
  LayoutPanelTop,
  Monitor,
  Play,
  Moon,
  Sun,
  Redo2,
  ScanSearch,
  Settings,
  Smartphone,
  Tablet,
  Undo2,
  MessageSquareText,
} from 'lucide-react'
import { labelOf, redo, save, setState, toast, undo, useEditor, type View } from './store'
import { visiblePath } from './tree'
import { Button, IconButton, Segmented, Tooltip, cx } from '../ui/kit'
import { ResponsiveCheck, useIssues } from './panels/ResponsiveCheck'
import { setTheme, useTheme } from '../ui/theme'

export function Logo() {
  return <img src="/logo.svg" width={28} height={28} alt="systeme.io" draggable={false} />
}

export function TopBar() {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedId)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const view = useEditor((s) => s.view)
  const panel = useEditor((s) => s.panel)
  const threadOpen = useEditor((s) => s.threadOpen)
  const hasPage = useEditor((s) => s.doc.sections.length > 0 || s.aiBusy)
  const lastSaved = useEditor((s) => s.lastSaved)
  const issues = useIssues()
  const checkBtn = useRef<HTMLButtonElement>(null)
  const [checkOpen, setCheckOpen] = useState(false)
  const trail = visiblePath(doc, selectedId)
  useEffect(() => {
    const open = () => setCheckOpen(true)
    window.addEventListener('editor:open-check', open)
    return () => window.removeEventListener('editor:open-check', open)
  }, [])
  const togglePanel = (p: 'settings' | 'history' | 'popups') => setState({ panel: panel === p ? null : p, selectedId: null, editingId: null })

  return (
    <header className="glass-bar absolute inset-x-0 top-0 z-40 flex h-12 items-center gap-1 px-3">
      <div className="mr-1 flex items-center">
        <Logo />
      </div>
      <IconButton tip="Undo" kbd="⌘Z" disabled={!canUndo} onClick={undo}>
        <Undo2 size={16} />
      </IconButton>
      <IconButton tip="Redo" kbd="⇧⌘Z" disabled={!canRedo} onClick={redo}>
        <Redo2 size={16} />
      </IconButton>
      <span className="mx-1.5 h-5 w-px bg-[var(--line-2)]" />
      <NavButton active={panel === 'popups'} onClick={() => togglePanel('popups')} icon={<LayoutPanelTop size={15} />}>
        Popups
      </NavButton>
      <NavButton active={panel === 'settings'} onClick={() => togglePanel('settings')} icon={<Settings size={15} />}>
        Settings
      </NavButton>
      <NavButton active={panel === 'history'} onClick={() => togglePanel('history')} icon={<Clock3 size={15} />}>
        History
      </NavButton>
      <span className="mx-1.5 h-5 w-px bg-[var(--line-2)]" />

      <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-[13px]">
        {trail.map((n, i) => (
          <span key={n.id} className="flex min-w-0 items-center gap-0.5">
            {i > 0 && <ChevronRight size={13} className="flex-none text-[var(--t4)]" />}
            <button
              onClick={() => setState({ selectedId: n.id, editingId: null })}
              className={cx(
                'press truncate rounded-[6px] px-1.5 py-0.5',
                i === trail.length - 1 ? 'font-medium text-[var(--brand-ink)]' : 'text-[var(--t3)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]',
              )}
            >
              {labelOf(n)}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-1.5">
        <Segmented<View>
          size="sm"
          value={view}
          onChange={(v) => setState({ view: v, focusDevice: v === 'all' ? 'desktop' : v })}
          options={[
            { value: 'desktop', icon: <Monitor size={14} />, tip: 'Desktop' },
            { value: 'tablet', icon: <Tablet size={14} />, tip: 'Tablet' },
            { value: 'mobile', icon: <Smartphone size={14} />, tip: 'Mobile' },
            { value: 'all', icon: <Columns3 size={14} />, tip: 'All devices side by side' },
          ]}
        />
        <Tooltip label="Check tablet and mobile">
          <button
            ref={checkBtn}
            onClick={() => setCheckOpen((o) => !o)}
            className={cx(
              'press flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[12px] font-medium',
              checkOpen ? 'bg-[var(--fill-2)] text-[var(--t1)]' : 'text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]',
            )}
          >
            <ScanSearch size={15} />
            {issues.length > 0 ? (
              <span className="tnum flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--warntint)] px-1 text-[11px] font-semibold text-[var(--warn)]">{issues.length}</span>
            ) : (
              <span className="text-[var(--ok)]">OK</span>
            )}
          </button>
        </Tooltip>
        {checkOpen && checkBtn.current && <ResponsiveCheck anchor={checkBtn.current} onClose={() => setCheckOpen(false)} />}
        <Tooltip label={hasPage ? 'AI assistant' : 'Describe your page first'} kbd={hasPage ? '⌘J' : undefined}>
          <button
            disabled={!hasPage}
            onClick={() => setState((st) => ({ threadOpen: !st.threadOpen }))}
            className={cx(
              'press flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium',
              threadOpen && hasPage ? 'bg-[var(--fill-2)] text-[var(--t1)]' : 'text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)] disabled:text-[var(--t4)] disabled:hover:bg-transparent',
            )}
          >
            <MessageSquareText size={15} />
            AI
          </button>
        </Tooltip>
        <ThemeToggle />
        <IconButton tip="Preview" kbd="⌘P" onClick={() => setState({ preview: true })}>
          <Play size={16} />
        </IconButton>
        <span className="mx-0.5 h-5 w-px bg-[var(--line-2)]" />
        <Tooltip label={lastSaved ? `Autosaved at ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Save'} kbd="⌘S">
          <button onClick={() => save()} className="press h-8 rounded-[8px] bg-[var(--brand-tint)] px-3.5 text-[13px] font-medium text-[var(--brand-ink)] hover:bg-[var(--brand-tint-hover)]">
            Save
          </button>
        </Tooltip>
        <Button
          variant="brand"
          onClick={() => {
            save(false)
            toast('Saved. In the live app, Exit returns to your funnel.')
          }}
        >
          Exit
        </Button>
      </div>
    </header>
  )
}

function NavButton({ children, icon, active, onClick }: { children: React.ReactNode; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'press flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[13px] font-medium',
        active ? 'bg-[var(--fill-2)] text-[var(--t1)]' : 'text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function ThemeToggle() {
  const theme = useTheme()
  const dark = theme === 'dark'
  return (
    <IconButton tip={dark ? 'Light mode' : 'Dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </IconButton>
  )
}
