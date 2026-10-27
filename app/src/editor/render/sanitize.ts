const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'A', 'BR', 'FONT', 'SPAN'])

/** Keep only simple inline formatting from contentEditable / AI output. */
export function sanitize(html: string): string {
  if (!/[<&]/.test(html)) return html
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const walk = (el: Element | DocumentFragment) => {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 1) {
        const c = child as Element
        walk(c)
        if (!ALLOWED.has(c.tagName)) {
          c.replaceWith(...Array.from(c.childNodes))
          continue
        }
        for (const a of Array.from(c.attributes)) {
          const keep =
            (c.tagName === 'A' && a.name === 'href' && /^(https?:|mailto:|tel:|#|\/|data:(application|image|text|audio|video)\/[\w.+-]+;base64,)/i.test(a.value)) ||
            (c.tagName === 'A' && a.name === 'target' && a.value === '_blank') ||
            (c.tagName === 'A' && a.name === 'rel' && /^(nofollow|noopener|noreferrer)( (nofollow|noopener|noreferrer))*$/.test(a.value)) ||
            (c.tagName === 'A' && a.name === 'data-popup' && /^[\w-]+$/.test(a.value)) ||
            (c.tagName === 'FONT' && a.name === 'color' && /^#?[\w(),.\s%]+$/.test(a.value))
          if (!keep) c.removeAttribute(a.name)
        }
        if (c.tagName === 'SPAN' && !c.attributes.length) c.replaceWith(...Array.from(c.childNodes))
      } else if (child.nodeType !== 3) child.remove()
    }
  }
  walk(tpl.content)
  return tpl.innerHTML.replace(/<br>$/, '')
}
