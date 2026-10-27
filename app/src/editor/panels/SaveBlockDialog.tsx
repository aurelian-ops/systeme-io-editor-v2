import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleHelp, Copy, Link2, X } from 'lucide-react'
import { labelOf, setState, useEditor } from '../store'
import { find } from '../tree'
import { commitSaveBlock } from '../blocksStore'
import { Button, cx, IconButton, Popover, Scrim, Toggle, Tooltip } from '../../ui/kit'
import { PageView } from '../render/PageView'
import { asSection } from '../blockLibrary'
import type { Node, PageDoc } from '../types'

/** "Save as a block" (option 2): preview on the left; title and Block / Master block on the right, like V1 plus a clear choice. */
/**
 * Which save-as-block UI to show: "quick" (option 3, a small panel from the save button) or
 * "dialog" (option 2). Kept switchable while we compare them.
 */
const SAVE_STYLE: 'quick' | 'dialog' | 'sheet' = 'sheet'

export function SaveBlockDialog() {
  const at = useEditor((s) => s.saveBlockAt)
  const id = useEditor((s) => s.saveBlockFor)
  if (SAVE_STYLE === 'quick' && id && at) return <QuickSave key={id} id={id} at={at} />
  if (SAVE_STYLE === 'sheet') return <SaveSheet />
  return <SaveDialog />
}

/** Option 3 (Raycast / Notion): no dialog; a small panel grows out of the save button, name already filled in, Enter saves. */
function QuickSave({ id, at }: { id: string; at: { x: number; y: number; w: number; h: number } }) {
  const node = useEditor((s) => find(s.doc, id))
  const [name, setName] = useState(() => (node ? labelOf(node) : ''))
  const [master, setMaster] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    requestAnimationFrame(() => input.current?.select())
  }, [])
  const anchor = useMemo(() => ({ getBoundingClientRect: () => new DOMRect(at.x, at.y, at.w, at.h), contains: () => false }) as unknown as HTMLElement, [at])
  if (!node) return null
  const already = !!node.props.masterId
  const close = () => setState({ saveBlockFor: null, saveBlockAt: null })
  const save = () => {
    if (!name.trim()) return
    commitSaveBlock(asItLooks(node), name.trim(), master)
    close()
  }
  return (
    <Popover anchor={anchor} onClose={close} width={300} align="end">
      <div
        className="p-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') close()
        }}
      >
        <div className="mb-2 text-[13px] font-semibold">Save as a block</div>
        <input
          ref={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Block name"
          className="h-9 w-full rounded-[8px] bg-[var(--fill-1)] px-3 text-[13px] outline-none placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]"
        />
        <label className={cx('mt-2.5 flex items-center gap-2.5 text-[12.5px] text-[var(--t2)]', already && 'opacity-60')}>
          <Toggle checked={master || already} onChange={(v) => !already && setMaster(v)} label="Master block" />
          Master block
          <Tooltip label={already ? 'This is already a master block.' : 'Changes to a master block will reflect on all pages that use it.'}>
            <span className="flex text-[var(--t4)]">
              <CircleHelp size={14} />
            </span>
          </Tooltip>
        </label>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11.5px] text-[var(--t4)]">↵ to save</span>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
            <button
              onClick={save}
              disabled={!name.trim()}
              className={cx('press h-7 rounded-[8px] px-3 text-[12.5px] font-medium text-white disabled:opacity-45', master ? 'bg-[var(--master)] hover:opacity-90' : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)]')}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Popover>
  )
}

/** Option 1 (Apple sheet, V1 layout): title, a master switch with its meaning under it, a wide preview, Cancel and Create. */
function SaveSheet() {
  const id = useEditor((s) => s.saveBlockFor)
  const node = useEditor((s) => find(s.doc, s.saveBlockFor))
  const [name, setName] = useState('')
  const [master, setMaster] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!node) return
    setName(labelOf(node))
    setMaster(false)
    requestAnimationFrame(() => input.current?.select())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!id || !node) return null
  const already = !!node.props.masterId
  const close = () => setState({ saveBlockFor: null, saveBlockAt: null })
  const save = () => {
    if (!name.trim()) return
    commitSaveBlock(asItLooks(node), name.trim(), master)
    close()
  }
  return (
    <Scrim onClose={close}>
      <div
        role="dialog"
        aria-label="Save as a block"
        className="flex max-h-[calc(100vh-48px)] w-[600px] max-w-[calc(100vw-32px)] flex-col rounded-[16px] bg-[var(--raised)] p-6 shadow-[var(--shadow-pop)]"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && close()}
      >
        <div className="flex items-center justify-between">
          <div className="text-[18px] font-semibold tracking-[-0.01em]">Save as a block</div>
          <IconButton tip="Close" kbd="Esc" onClick={close} className="-mr-2">
            <X size={16} />
          </IconButton>
        </div>
        <label className="mb-2 mt-4 block text-[13px] font-medium text-[var(--t2)]">Title</label>
        <input
          ref={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="e.g. Hero for yoga pages"
          className="h-11 w-full rounded-[10px] bg-[var(--fill-1)] px-3.5 text-[14px] outline-none placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]"
        />
        <label className={cx('mt-4 flex items-start gap-3', already && 'opacity-60')}>
          <span className="pt-0.5">
            <Toggle checked={master || already} onChange={(v) => !already && setMaster(v)} label="Make it a master block" />
          </span>
          <span>
            <span className="block text-[14px] font-medium text-[var(--t1)]">Make it a master block</span>
            <span className="block text-[13px] leading-[19px] text-[var(--t3)]">{already ? 'This is already a master block.' : 'Changes to a master block will reflect on all pages that use it.'}</span>
          </span>
        </label>
        <label className="mb-2 mt-5 block text-[13px] font-medium text-[var(--t2)]">Preview</label>
        <BlockPreview node={node} master={master || already} width={552} />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={close} className="!h-9 !px-4 !text-[14px]">
            Cancel
          </Button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className={cx('press h-9 rounded-[10px] px-5 text-[14px] font-medium text-white disabled:opacity-45', master ? 'bg-[var(--master)] hover:opacity-90' : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)]')}
          >
            Create
          </button>
        </div>
      </div>
    </Scrim>
  )
}

/** Option 2 (Figma "Create component"): preview on the left, name and Block / Master block on the right. */
function SaveDialog() {
  const id = useEditor((s) => s.saveBlockFor)
  const node = useEditor((s) => find(s.doc, s.saveBlockFor))
  const [name, setName] = useState('')
  const [master, setMaster] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!node) return
    setName(labelOf(node))
    setMaster(false)
    requestAnimationFrame(() => input.current?.select())
    // reset only when a new node is being saved
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!id || !node) return null
  const close = () => setState({ saveBlockFor: null, saveBlockAt: null })
  const save = () => {
    if (!name.trim()) return
    commitSaveBlock(asItLooks(node), name.trim(), master)
    close()
  }
  const already = !!node.props.masterId

  return (
    <Scrim onClose={close}>
      {/* option 2 (Figma "Create component"): the block on the left, name and type on the right */}
      <div
        role="dialog"
        aria-label="Save as a block"
        className="flex max-h-[calc(100vh-48px)] w-[820px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[16px] bg-[var(--raised)] shadow-[var(--shadow-pop)]"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && close()}
      >
        <div className="flex w-[360px] flex-none flex-col gap-3 bg-[var(--fill-1)] p-6">
          <span className="text-[13px] font-medium text-[var(--t2)]">Preview</span>
          <BlockPreview node={node} master={master || already} />
          <span className="text-[12.5px] text-[var(--t3)]">Saved to Blocks › My blocks</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-6">
          <div className="mb-5 text-[18px] font-semibold tracking-[-0.01em]">Save as a block</div>
          <label className="mb-2 block text-[13px] font-medium text-[var(--t2)]">Title</label>
          <input
            ref={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="e.g. Hero for yoga pages"
            className="h-11 w-full rounded-[10px] bg-[var(--fill-1)] px-3.5 text-[14px] outline-none placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]"
          />
          <div className="mt-4 flex flex-col gap-2.5">
            <Choice active={!master} onClick={() => setMaster(false)} icon={<Copy size={17} />} title="Block" text="A copy you can change freely on each page." />
            <Choice
              master
              active={master}
              onClick={() => !already && setMaster(true)}
              disabled={already}
              icon={<Link2 size={17} />}
              title="Master block"
              text={already ? 'This is already a master block.' : 'Changes to a master block will reflect on all pages that use it.'}
            />
          </div>
          <div className="mt-auto flex justify-end gap-2 pt-6">
            <Button variant="ghost" onClick={close} className="!h-9 !px-4 !text-[14px]">
              Cancel
            </Button>
            <button
              onClick={save}
              disabled={!name.trim()}
              className={cx('press h-9 rounded-[10px] px-5 text-[14px] font-medium text-white disabled:opacity-45', master ? 'bg-[var(--master)] hover:opacity-90' : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)]')}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </Scrim>
  )
}

const PREVIEW_W = 312

const TEXT_TYPES = new Set(['headline', 'text', 'eyebrow', 'list'])

/**
 * The element as it looks on the page: text that only looks white (or any colour) because of the section
 * it sits in keeps that colour in the saved block, so it looks the same wherever it's placed later.
 */
function asItLooks(node: Node): Node {
  if (!TEXT_TYPES.has(node.type) || node.style.desktop.color) return node
  const el = document.querySelector(`.page-root[data-device="desktop"] [data-node="${node.id}"]`) as HTMLElement | null
  const target = (el?.querySelector('h1,h2,h3,h4,h5,h6,p,[contenteditable],li') as HTMLElement | null) ?? el
  if (!target) return node
  const copy = structuredClone(node)
  copy.style.desktop.color = getComputedStyle(target).color
  return copy
}

/**
 * Light text needs a darker checkerboard to be seen (the checkerboard itself means "no background"). The colour is
 * read as the browser draws it, so hex, theme colours and inherited colours all count.
 */
function isLightText(node: Node) {
  const el = document.querySelector(`.page-root[data-device="desktop"] [data-node="${node.id}"]`) as HTMLElement | null
  const target = (el?.querySelector('h1,h2,h3,h4,h5,h6,p,[contenteditable],li,span') as HTMLElement | null) ?? el
  let c = target ? getComputedStyle(target).color : ''
  if (!c && node.style.desktop.color) {
    const probe = document.createElement('span')
    probe.style.color = node.style.desktop.color
    document.body.appendChild(probe)
    c = getComputedStyle(probe).color
    probe.remove()
  }
  const m = c.match(/[\d.]+/g)
  if (!m || m.length < 3) return false
  const [r, g, b] = m.map(Number)
  return (r * 299 + g * 587 + b * 114) / 1000 >= 170
}
/**
 * The real block, drawn at a readable size: scaled to the element's own width on the page
 * (a headline stays big, a full section fits), never larger than it really is.
 */
function BlockPreview({ node, master, width: paneW = PREVIEW_W }: { node: Node; master: boolean; width?: number }) {
  const doc = useEditor((s) => s.doc)
  const view = useMemo(() => ({ ...doc, sections: [] }) as PageDoc, [doc])
  const looks = useMemo(() => asItLooks(node), [node])
  const only = useMemo(() => [asSection(looks)], [looks])
  const element = node.type !== 'section'
  const lightText = useMemo(() => element && isLightText(looks), [element, looks])
  // drawn at a narrower width than the page so text wraps inside the preview and stays readable (sections keep the page width)
  const width = useMemo(() => {
    const el = document.querySelector(`.page-root[data-device="desktop"] [data-node="${node.id}"]`) as HTMLElement | null
    return node.type === 'section' ? 1280 : Math.min(paneW > 400 ? 900 : 560, Math.max(360, (el?.offsetWidth ?? 560) + 80))
  }, [node, paneW])
  const z = Math.min(1, paneW / width)
  return (
    // a single element is saved without a background: the checkerboard (as in design tools) says "transparent"
    <div
      className={cx('relative overflow-auto rounded-[12px] shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(0,0,0,.04)]', element && 'preview-plain', element && (lightText ? 'checker-dark' : 'checker-light'))}
      style={{ maxHeight: 360 }}
    >
      <div style={{ width, zoom: z, pointerEvents: 'none' }}>
        <PageView doc={view} device="desktop" only={only} />
      </div>
      {master && (
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-[7px] bg-[var(--master-tint)] px-2 py-1 text-[12px] font-semibold text-[var(--master)]">
          <Link2 size={13} />
          Master
        </span>
      )}
    </div>
  )
}

function Choice({ active, onClick, icon, title, text, disabled, master }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string; disabled?: boolean; master?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cx(
        'press flex items-start gap-3 rounded-[12px] p-3.5 text-left disabled:opacity-60',
        active
          ? master
            ? 'bg-[var(--master-tint)] shadow-[inset_0_0_0_1.5px_var(--master)]'
            : 'bg-[var(--brand-tint)] shadow-[inset_0_0_0_1.5px_var(--brand)]'
          : 'shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-[var(--fill-1)]',
      )}
    >
      <span className={cx('flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-[var(--raised)] shadow-[0_0_0_1px_var(--line)]', master ? 'text-[var(--master)]' : 'text-[var(--t2)]')}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-[var(--t1)]">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-[19px] text-[var(--t3)]">{text}</span>
      </span>
    </button>
  )
}
