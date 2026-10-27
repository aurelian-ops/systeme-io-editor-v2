import { Bookmark, MessageSquareText, RotateCcw, User } from 'lucide-react'
import { checkpoint, restoreCheckpoint, toast, undo, redo, useEditor } from '../store'
import { Button, IconButton } from '../../ui/kit'
import { PanelHeader } from './SettingsPanel'

export function HistoryPanel() {
  const cps = useEditor((s) => s.checkpoints)
  const past = useEditor((s) => s.past.length)
  const future = useEditor((s) => s.future.length)
  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="History"
        right={
          <Button
            size="sm"
            onClick={() => {
              checkpoint('Saved version', 'you')
              toast('Version saved')
            }}
          >
            <Bookmark size={13} />
            Save version
          </Button>
        }
      />
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 text-[12px] text-[var(--t3)]">
        <span className="tnum">
          {past} {past === 1 ? 'step' : 'steps'} to undo
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" disabled={!past} onClick={undo}>
            Undo
          </Button>
          <Button size="sm" variant="ghost" disabled={!future} onClick={redo}>
            Redo
          </Button>
        </div>
      </div>
      <div className="scroll-thin scroll-edge min-h-0 flex-1 overflow-y-auto p-2">
        {cps.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <div className="text-[13px] font-medium">No versions yet</div>
            <p className="mt-1 text-[12px] leading-[18px] text-[var(--t3)]">Each AI change you keep is saved here, and so is every version you save. Restore any of them in one click.</p>
          </div>
        ) : (
          cps.map((c) => (
            <div key={c.id} className="group flex items-center gap-2.5 rounded-[8px] px-2 py-2 hover:bg-[var(--fill-1)]">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--fill-1)] text-[var(--t2)]">
                {c.source === 'ai' ? <MessageSquareText size={13} /> : <User size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{c.label}</div>
                <div className="tnum text-[11px] text-[var(--t4)]">
                  {new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {c.doc.sections.length} sections
                </div>
              </div>
              <IconButton tip="Restore this version" className="opacity-0 group-hover:opacity-100" onClick={() => restoreCheckpoint(c.id)}>
                <RotateCcw size={14} />
              </IconButton>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
