import { contentWidth, fitColumns, resolveStyle } from './responsive'
import { labelOf } from './store'
import { find, walk } from './tree'
import { DEVICE_WIDTH, type Device, type Node, type PageDoc, type Style } from './types'

export interface Issue {
  id: string
  device: Device
  nodeId: string
  title: string
  detail: string
  fix: { key: keyof Style; value: Style[keyof Style] }
}

const TEXTY = ['text', 'list', 'eyebrow', 'quote', 'form']
const WORDS = new Set(['text', 'headline', 'list', 'quote', 'button', 'form', 'faq', 'eyebrow'])
const sidePad = (st: Style) => Math.min(st.paddingX ?? st.pad?.[1] ?? 0, st.paddingX ?? st.pad?.[3] ?? 0)
/** words in this section that reach the screen edge: no box between the section and them adds a side margin */
function unpaddedText(section: Node, device: Device, smart: boolean): boolean {
  const look = (n: Node, padded: boolean): boolean => {
    if (WORDS.has(n.type)) return !padded
    const st = resolveStyle(n, device, smart).style
    const pad = padded || sidePad(st) >= 14
    return (n.children ?? []).some((c) => look(c, pad))
  }
  return (section.children ?? []).some((c) => look(c, false))
}

/** Rules a phone or tablet layout must pass. Each issue carries its own fix. */
export function audit(doc: PageDoc): Issue[] {
  const out: Issue[] = []
  const smart = doc.smartResponsive
  for (const device of ['tablet', 'mobile'] as Device[]) {
    const W = DEVICE_WIDTH[device]
    for (const section of doc.sections) {
      const avail = contentWidth(section, device, smart)
      walk([section], (n) => {
        let cols: number | undefined
        if (n.type === 'row') {
          const k = n.children?.length ?? 1
          const gap = n.style.desktop.gap ?? 24
          cols = smart ? fitColumns(k, avail, n.props.minCol ?? 280, device === 'mobile' ? Math.min(gap, 24) : gap * 0.7) : device === 'mobile' ? 1 : k
        }
        const s = resolveStyle(n, device, smart, { cols }).style
        if (s.hidden) return
        const add = (title: string, detail: string, key: keyof Style, value: Style[keyof Style]) =>
          out.push({ id: `${device}:${n.id}:${key}`, device, nodeId: n.id, title, detail, fix: { key, value } })

        if (TEXTY.includes(n.type) && s.fontSize !== undefined && s.fontSize < 14)
          add('Text too small to read', `${labelOf(n)} is ${s.fontSize}px. 16px reads comfortably on a ${device}.`, 'fontSize', 16)

        if (device === 'mobile' && (n.type === 'text' || n.type === 'list') && s.fontSize !== undefined && s.fontSize > 18)
          add('Body text large for a phone', `${s.fontSize}px makes long paragraphs. 17px keeps more on screen.`, 'fontSize', 17)

        if (n.type === 'headline' && s.fontSize) {
          const max = Math.round(W * (device === 'mobile' ? 0.105 : 0.085))
          if (s.fontSize > max)
            add('Headline too big for the screen', `${s.fontSize}px wraps into many short lines. ${Math.round(max * 0.86)}px fits better.`, 'fontSize', Math.round(max * 0.86))
        }

        if (n.type === 'button') {
          const h = (s.paddingY ?? 14) * 2 + (s.fontSize ?? 16) * 1.2
          if (h < 44) add('Button hard to tap', `It is ${Math.round(h)}px tall. Fingers need at least 44px.`, 'paddingY', Math.ceil((46 - (s.fontSize ?? 16) * 1.2) / 2))
          if (device === 'mobile' && !s.fullWidth && n.props.variant !== 'secondary')
            add('Main button not full width', 'A full-width button is easier to reach with a thumb.', 'fullWidth', true)
        }

        if (n.type === 'section') {
          if (device === 'mobile' && (s.paddingY ?? 0) > 96) add('Too much empty space', `${s.paddingY}px above and below pushes content off screen.`, 'paddingY', 56)
          // (an edge-to-edge section whose words sit in a padded box inside is fine)
          if (device === 'mobile' && (s.paddingX ?? 0) < 14 && unpaddedText(n, device, smart)) add('Content touches the edge', 'Text needs a margin from the screen edge.', 'paddingX', 20)
          if (device === 'mobile' && (s.paddingX ?? 0) > 40) add('Side margins too wide', `${s.paddingX}px on each side leaves little room for content.`, 'paddingX', 20)
        }

        if (n.type === 'row' && cols !== undefined) {
          const c = s.columns ?? cols
          const gap = s.gap ?? 24
          const colW = (avail - gap * (c - 1)) / c
          const min = Math.min(n.props.minCol ?? 280, 220) * 0.8
          if (c > 1 && colW < min) {
            const fit = fitColumns(n.children?.length ?? 1, avail, n.props.minCol ?? 280, gap)
            add('Columns too narrow', `${c} columns of ${Math.round(colW)}px squeeze the content.`, 'columns', fit)
          }
        }

        if (n.type === 'column' && (s.paddingX ?? 0) * 2 > avail * 0.3)
          add('Box padding too large', `${s.paddingX}px of padding leaves little room inside.`, 'paddingX', 20)
      })
    }
  }
  return out
}

export function applyFix(d: PageDoc, issue: Issue) {
  const n: Node | undefined = find(d, issue.nodeId)
  if (!n) return
  const bucket = (n.style[issue.device] ??= {}) as Record<string, unknown>
  bucket[issue.fix.key] = issue.fix.value
}
