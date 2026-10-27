import { useEffect } from 'react'
import { deleteAnchorEl, labelOf, removeNode, setState, useEditor } from '../store'
import { find } from '../tree'
import { Button, Popover } from '../../ui/kit'

/**
 * Delete confirmation (V1 asks too), option A "Anchored" (Linear, Figma): a small card that grows out of
 * the trash button you clicked, no dimming, no jump to the middle of the screen. Playbook rule for destructive
 * actions: a filled danger button with an explicit verb, a body that says what is lost, then a toast with Undo.
 */
export function ConfirmDelete() {
  const id = useEditor((s) => s.confirmDelete)
  const node = useEditor((s) => find(s.doc, s.confirmDelete))
  const anchor = id ? deleteAnchorEl() : null
  const live = anchor?.isConnected ? anchor : null

  useEffect(() => {
    if (!id) return
    // the trash it came from stays lit red while the question is open
    live?.setAttribute('data-armed', '')
    // while it's open, Esc / Enter belong to the confirm only (not the editor's own shortcuts), so focus can stay where it was
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Delete') return
      e.stopPropagation()
      e.preventDefault()
      if (e.key === 'Escape') setState({ confirmDelete: null })
      if (e.key === 'Enter') {
        setState({ confirmDelete: null })
        removeNode(id)
      }
    }
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('keydown', key, true)
      live?.removeAttribute('data-armed')
    }
  }, [id, live])

  if (!id || !node) return null
  const close = () => setState({ confirmDelete: null })
  const confirm = () => {
    close()
    removeNode(id)
  }
  const inside = (node.children?.length ?? 0) > 0
  const label = labelOf(node)
  // "This row", but keep names like "reCAPTCHA" or "X share button" as they are
  const name = /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label

  const card = (
    <div role="alertdialog" aria-label="Delete this item" className="p-4" onPointerDown={(e) => e.stopPropagation()}>
      <div className="text-[14px] font-semibold leading-[20px] tracking-[-0.006em] text-[var(--t1)]">Are you sure you want to delete this item?</div>
      <p className="mt-1 text-[12.5px] leading-[18px] text-[var(--t3)]">
        This {name}
        {inside ? ' and everything inside it will be removed.' : ' will be removed.'}
      </p>
      <div className="mt-3.5 flex justify-end gap-1.5">
        <Button variant="ghost" onClick={close} className="!h-[30px] !px-3">
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} className="!h-[30px] !px-3">
          Delete
        </Button>
      </div>
    </div>
  )

  return live ? (
    <Popover anchor={live} onClose={close} width={296} align="end">
      {card}
    </Popover>
  ) : (
    // no trash on screen (e.g. Delete key with the toolbar scrolled away): the same card, centred
    <div className="fixed inset-0 z-[900] grid place-items-center" onPointerDown={close}>
      <div className="material w-[296px] rounded-[10px] shadow-[var(--shadow-pop)]">{card}</div>
    </div>
  )
}
