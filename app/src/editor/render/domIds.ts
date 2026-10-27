import type { Node } from '../types'

/**
 * The id an element carries on the page (shown and copied in its settings › HTML attributes), so custom code can
 * reach it, e.g. `#button-gga5s5j8 { … }` in Raw HTML or the header code.
 */
export function elementDomId(node: Pick<Node, 'id' | 'type'>) {
  if (node.type === 'input') return `field-${node.id.slice(-8)}`
  if (node.type === 'checkbox') return `checkbox-${node.id.slice(-8)}`
  return `${node.type}-${node.id.slice(-8)}`
}

/* ---------------- Custom CSS from Raw HTML, made to win over the editor's own styles ---------------- */

/** Splits CSS into its top-level rules (by braces), keeping comments out. */
function topRules(css: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        out.push(clean.slice(start, i + 1).trim())
        start = i + 1
      }
    } else if (ch === ';' && depth === 0) {
      // a top-level statement such as @import
      out.push(clean.slice(start, i + 1).trim())
      start = i + 1
    }
  }
  return out.filter(Boolean)
}

/** Every declaration gets !important (elements keep their look in inline styles, which plain CSS can't beat). */
function important(rule: string): string {
  if (/^@(keyframes|-webkit-keyframes|font-face|import|charset|namespace)/i.test(rule)) return rule
  return rule.replace(/([^{};]+:[^{};]+?)(\s*!important)?\s*(;|(?=\}))/g, (m, decl: string, imp: string | undefined, end: string) =>
    /^\s*(@|--)/.test(decl) || imp ? m : `${decl} !important${end}`,
  )
}

/**
 * The user's CSS as it should apply: `scope` keeps it on the page you design (in the editor, never the editor's
 * own panels and buttons). Fonts, keyframes and imports stay at the top level, where CSS needs them.
 */
export function customCss(css: string, scope?: string): string {
  return topRules(css)
    .map((r) => {
      const ruled = important(r)
      return scope && !/^@(keyframes|-webkit-keyframes|font-face|import|charset|namespace)/i.test(r) ? `${scope} { ${ruled} }` : ruled
    })
    .join('\n')
}

/** The contents of every <style> block in some HTML. */
export function styleBlocks(html: string): string {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')
}
