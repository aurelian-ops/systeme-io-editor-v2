/**
 * Safari still measures anything inside a CSS `zoom` in unzoomed pixels (Chrome and Firefox moved to the standard
 * in 2024): getBoundingClientRect and getClientRects come back divided by the zoom. The canvas scales the page with
 * zoom and every outline, drop line and toolbar is placed from those boxes, so in Safari the selection landed beside
 * the element and too big. Where the browser does that, its answers are scaled back up here, once for the whole app.
 */

function measuresUnzoomed() {
  const outer = document.createElement('div')
  outer.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;zoom:0.5'
  const inner = document.createElement('div')
  inner.style.cssText = 'width:100px;height:10px'
  outer.append(inner)
  document.documentElement.append(outer)
  const w = inner.getBoundingClientRect().width
  outer.remove()
  return w > 75
}

/** The zoom an element is drawn at: its own and every ancestor's (the editor only sets zoom inline). */
function zoomOf(node: Node | null) {
  let z = 1
  for (let el = node instanceof Element ? node : (node?.parentElement ?? null); el; el = el.parentElement) {
    const v = (el as HTMLElement).style?.zoom
    if (v) z *= parseFloat(v) || 1
  }
  return z
}

const scale = (r: DOMRect, z: number) => (z === 1 ? r : new DOMRect(r.x * z, r.y * z, r.width * z, r.height * z))
const scaleAll = (list: DOMRectList, z: number) => (z === 1 ? list : (Array.from(list, (r) => scale(r, z)) as unknown as DOMRectList))

if (typeof document !== 'undefined' && measuresUnzoomed()) {
  const el = Element.prototype
  const range = Range.prototype
  const elBox = el.getBoundingClientRect
  const elRects = el.getClientRects
  const rangeBox = range.getBoundingClientRect
  const rangeRects = range.getClientRects
  el.getBoundingClientRect = function () {
    return scale(elBox.call(this), zoomOf(this))
  }
  el.getClientRects = function () {
    return scaleAll(elRects.call(this), zoomOf(this))
  }
  range.getBoundingClientRect = function () {
    return scale(rangeBox.call(this), zoomOf(this.commonAncestorContainer))
  }
  range.getClientRects = function () {
    return scaleAll(rangeRects.call(this), zoomOf(this.commonAncestorContainer))
  }
}
