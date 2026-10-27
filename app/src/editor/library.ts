import {
  FileInput,
  Film,
  Hash,
  HelpCircle,
  Image,
  LayoutTemplate,
  List,
  Minus,
  MousePointerClick,
  Quote,
  Tag,
  Timer,
  Type,
  Gem,
  MoveVertical,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import { ELEMENT_DEFAULTS, el, row } from './blocks'
import { HeadingSerif } from './icons/HeadingSerif'
import { ColumnsGrow } from './icons/ColumnsGrow'
import { REGISTRY } from './elements'
import type { Node, NodeType } from './types'

export interface LibItem {
  id: string
  label: string
  icon: LucideIcon
  make: () => Node
  /** Layout items can only live in a section, not inside a column. */
  layout?: boolean
  section?: boolean
  formOnly?: boolean
}

const mk = (t: keyof typeof ELEMENT_DEFAULTS) => () => ELEMENT_DEFAULTS[t]!()

const BUILTIN: Record<string, LibItem> = {
  text: { id: 'text', label: 'Text', icon: Type, make: mk('text') },
  headline: { id: 'headline', label: 'Headline', icon: HeadingSerif, make: mk('headline') },
  list: { id: 'list', label: 'Bulleted list', icon: List, make: mk('list') },
  // one Row for every column layout: it starts with one column and grows to 6 (settings, or the + on its edge).
  // Like V1, a new row starts with 10px padding on every side.
  row1: { id: 'row1', label: 'Columns', icon: ColumnsGrow, layout: true, make: () => row([[]], { minCol: 200 }, { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 }) },
  section: {
    id: 'section',
    label: 'Section',
    icon: LayoutTemplate,
    section: true,
    // like V1: a new section starts with 40px padding on every side (desktop)
    make: () => el('section', { kind: 'blank', tone: 'light' }, { paddingY: 40, paddingX: 40, maxWidth: 1120, gap: 24 }, [row([[]], { minCol: 200, starter: true }, { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 })]),
  },
  form: { id: 'form', label: 'Form', icon: FileInput, make: mk('form') },
  button: { id: 'button', label: 'Button', icon: MousePointerClick, make: mk('button') },
  image: { id: 'image', label: 'Image', icon: Image, make: mk('image') },
  video: { id: 'video', label: 'Video', icon: Film, make: mk('video') },
  countdown: { id: 'countdown', label: 'Countdown', icon: Timer, make: mk('countdown') },
  divider: { id: 'divider', label: 'Horizontal line', icon: Minus, make: mk('divider') },
  faq: { id: 'faq', label: 'FAQ', icon: HelpCircle, make: mk('faq') },
  eyebrow: { id: 'eyebrow', label: 'Label', icon: Tag, make: mk('eyebrow') },
  quote: { id: 'quote', label: 'Testimonial', icon: Quote, make: mk('quote') },
  stat: { id: 'stat', label: 'Number', icon: Hash, make: mk('stat') },
  logos: { id: 'logos', label: 'Logo strip', icon: Building2, make: () => el('logos', { items: ['Northwind', 'Lumen', 'Atlas & Co', 'Kinfolk'] }) },
  price: {
    id: 'price',
    label: 'Price card',
    icon: Gem,
    make: () => el('price', { name: 'Complete', price: '€79', period: 'one time', features: ['Full access', 'Weekly calls', 'Community'], buttonText: 'Get access', featured: true }),
  },
  spacer: { id: 'spacer', label: 'Spacer', icon: MoveVertical, make: mk('spacer') },
}

/** Same groups and order as V1, then the V2 additions. Registry elements fill in when present. */
const ORDER: [string, string[]][] = [
  ['Text', ['text', 'headline', 'list', 'contentbox']],
  ['Column layout', ['row1', 'section']],
  ['Form', ['form', 'input', 'button', 'checkbox', 'recaptcha', 'calendar']],
  ['Payment', ['paybutton', 'product']],
  ['Media', ['image', 'video', 'audio', 'icon', 'carousel']],
  ['Social', ['xshare', 'survey']],
  ['Other', ['countdown', 'menu', 'divider', 'rawhtml', 'faq']],
  ['More', ['eyebrow', 'quote', 'stat', 'logos', 'price', 'spacer']],
]

function item(id: string): LibItem | undefined {
  if (BUILTIN[id]) return BUILTIN[id]
  const d = REGISTRY[id as NodeType]
  if (!d) return undefined
  return { id, label: d.label, icon: d.icon, make: d.make, formOnly: d.formOnly }
}

export const LIBRARY: { title: string; items: LibItem[] }[] = ORDER.map(([title, ids]) => ({
  title,
  items: ids.map(item).filter((x): x is LibItem => !!x),
})).filter((g) => g.items.length)

export const ALL_ITEMS = LIBRARY.flatMap((g) => g.items)
