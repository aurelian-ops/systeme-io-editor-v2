/** Small payment-brand marks the AI (and users) can place as images: src "brand:visa" etc. */
const svg = (w: number, h: number, body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`

export const BRAND_MARKS: Record<string, string> = {
  visa: svg(48, 16, `<text x="24" y="13.5" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic" font-size="15" fill="#1a1f71" letter-spacing="-.5">VISA</text>`),
  mastercard: svg(38, 24, `<circle cx="13" cy="12" r="11" fill="#eb001b"/><circle cx="25" cy="12" r="11" fill="#f79e1b"/><path d="M19 3.3a11 11 0 0 1 0 17.4 11 11 0 0 1 0-17.4z" fill="#ff5f00"/>`),
  amex: svg(48, 24, `<rect width="48" height="24" rx="3" fill="#1f72cd"/><text x="24" y="10.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="7.5" fill="#fff">AMERICAN</text><text x="24" y="19" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="7.5" fill="#fff">EXPRESS</text>`),
  discover: svg(74, 16, `<text x="0" y="12.5" font-family="Arial,sans-serif" font-weight="800" font-size="12" fill="#231f20" textLength="31" lengthAdjust="spacingAndGlyphs">DISC</text><circle cx="38" cy="8" r="5.6" fill="#f48120"/><text x="45" y="12.5" font-family="Arial,sans-serif" font-weight="800" font-size="12" fill="#231f20" textLength="28" lengthAdjust="spacingAndGlyphs">VER</text>`),
  paypal: svg(88, 24, `<path d="M8 3h7.5c3.6 0 5.6 1.9 5 5.2-.7 3.7-3.4 5.3-6.9 5.3h-2.2l-1.2 6.5H6.3L8 3z" fill="#003087"/><path d="M11 6h6.2c3 0 4.7 1.6 4.2 4.4-.6 3.1-2.8 4.4-5.8 4.4h-1.9l-1 5.2H9.3L11 6z" fill="#009cde" opacity=".85"/><text x="26" y="18" font-family="Verdana,Arial,sans-serif" font-weight="700" font-style="italic" font-size="15"><tspan fill="#003087">Pay</tspan><tspan fill="#009cde">Pal</tspan></text>`),
  applepay: svg(52, 22, `<rect width="52" height="22" rx="4" fill="#000"/><text x="26" y="15.5" text-anchor="middle" font-family="-apple-system,Arial,sans-serif" font-weight="600" font-size="11" fill="#fff"> Pay</text>`),
  stripe: svg(48, 20, `<text x="24" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="16" fill="#635bff">stripe</text>`),
}

export function resolveBrand(src?: string) {
  const m = src?.match(/^brand:([a-z]+)$/i)
  return m ? BRAND_MARKS[m[1].toLowerCase()] : undefined
}
