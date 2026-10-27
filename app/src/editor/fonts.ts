/** Font catalogue for the Font type picker, same groups as V1. */

export const WEB_SAFE_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Garamond']

export const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Poppins',
  'Source Sans 3',
  'Roboto Condensed',
  'Oswald',
  'Raleway',
  'Nunito',
  'Merriweather',
  'Playfair Display',
  'Rubik',
  'Work Sans',
  'DM Sans',
  'Manrope',
  'Plus Jakarta Sans',
  'Space Grotesk',
  'Bricolage Grotesque',
  'Fraunces',
  'Instrument Serif',
  'Lora',
  'PT Serif',
  'Libre Baskerville',
  'Cormorant Garamond',
  'Bebas Neue',
  'Archivo',
  'Outfit',
  'Sora',
  'Urbanist',
  'Figtree',
  'Josefin Sans',
  'Quicksand',
  'Karla',
  'Barlow',
  'Mulish',
  'Kanit',
  'Cairo',
  'Tajawal',
  'Noto Sans',
  'Noto Serif',
  'Geist',
  // the AI's visual directions (design skill)
  'Newsreader',
  'Hanken Grotesk',
  'Instrument Sans',
  'Bodoni Moda',
  'Jost',
  'Schibsted Grotesk',
  'Inter Tight',
  'Gloock',
  'Anton',
  'Source Serif 4',
  'IBM Plex Sans',
]

const loaded = new Set<string>(['Inter', 'Geist', 'Bricolage Grotesque', 'Fraunces', 'Plus Jakarta Sans', 'Instrument Serif', 'Manrope', 'Space Grotesk'])

export function ensureFont(name?: string) {
  if (!name || loaded.has(name) || WEB_SAFE_FONTS.includes(name) || customFonts.has(name)) return
  // the list above, or any other Google Fonts family the AI chose (a name like "DM Serif Display"); uploaded fonts load elsewhere
  if (!GOOGLE_FONTS.includes(name) && (customFonts.has(name) || !/^[A-Z][A-Za-z0-9 ]{1,40}$/.test(name))) return
  loaded.add(name)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700;800&display=swap`
  document.head.appendChild(link)
}

/** Fonts the user uploaded in this session. */
export const customFonts = new Map<string, string>()
export async function addCustomFont(file: File): Promise<string> {
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  const buf = await file.arrayBuffer()
  const face = new FontFace(name, buf)
  await face.load()
  document.fonts.add(face)
  customFonts.set(name, file.name)
  return name
}
