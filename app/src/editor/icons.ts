import {
  Activity,
  AlarmClock,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BadgeCheck,
  Bell,
  Book,
  BookOpen,
  Bookmark,
  Briefcase,
  Calendar,
  Camera,
  ChartBar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleArrowDown,
  CircleArrowUp,
  CircleChevronDown,
  CircleChevronUp,
  Clock,
  Cloud,
  Code,
  Coffee,
  CreditCard,
  Crown,
  Diamond,
  Dot,
  Download,
  Dumbbell,
  FileText,
  Film,
  Flag,
  Flame,
  Gift,
  Globe,
  GraduationCap,
  Headphones,
  Heart,
  HelpCircle,
  Home,
  Image,
  Key,
  Laptop,
  Leaf,
  Lightbulb,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Minus,
  Monitor,
  Moon,
  Music,
  Package,
  PenTool,
  Phone,
  PlayCircle,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Smile,
  Sparkle,
  Star,
  Sun,
  Tag,
  Target,
  ThumbsUp,
  Timer,
  TrendingUp,
  Trophy,
  Truck,
  User,
  Users,
  Video,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { createElement, type ComponentType, type SVGProps } from 'react'

export type IconComp = ComponentType<{ size?: number | string; strokeWidth?: number; color?: string; className?: string; style?: React.CSSProperties }>

/** Brand marks (not in lucide) drawn as filled glyphs that accept the same props. */
function brand(d: string, viewBox = '0 0 24 24'): IconComp {
  return ({ size = 24, color = 'currentColor', className, style }) =>
    createElement('svg', { viewBox, width: size, height: size, fill: color, className, style } as SVGProps<SVGSVGElement>, createElement('path', { d }))
}
const Facebook = brand('M14 8.5V6.8c0-.8.5-1 1-1h2V2.2h-2.8C11.1 2.2 10.4 4.5 10.4 6v2.5H8V12h2.4v9.8H14V12h2.7l.4-3.5z')
const Instagram = brand('M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 2.2c-2.7 0-3 0-4.1.1C4.4 2.4 2.4 4.4 2.3 7.9 2.2 9 2.2 9.3 2.2 12s0 3 .1 4.1c.1 3.5 2.1 5.5 5.6 5.6 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c3.5-.1 5.5-2.1 5.6-5.6.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.1-3.5-2.1-5.5-5.6-5.6C15 2.2 14.7 2.2 12 2.2z')
const Linkedin = brand('M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4v11H3zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6v5.4h-4v-4.8c0-1.2 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5v4.9h-4z')
const Youtube = brand('M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-4.8 31 31 0 0 0-.4-4.8zM9.7 15V9l5.8 3z')
/** The official X logo mark */
export const X_LOGO_PATH = 'm236 0h46l-101 115 118 156h-92.6l-72.5-94.8-83 94.8h-46l107-123-113-148h94.9l65.5 86.6zm-16.1 244h25.5l-165-218h-27.4z'
const XBrand = brand(X_LOGO_PATH, '0 0 300 271')

/** Icons users can pick for lists, buttons, FAQ and the Icon element. Names stay stable in saved pages. */
export const ICONS: Record<string, IconComp> = {
  check: Check,
  'check-circle': CheckCircle2,
  'badge-check': BadgeCheck,
  dot: Dot,
  star: Star,
  heart: Heart,
  'thumbs-up': ThumbsUp,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-circle-up': CircleChevronUp,
  'chevron-circle-down': CircleChevronDown,
  'circle-arrow-up': CircleArrowUp,
  'circle-arrow-down': CircleArrowDown,
  plus: Plus,
  minus: Minus,
  x: X,
  lightbulb: Lightbulb,
  rocket: Rocket,
  zap: Zap,
  flame: Flame,
  target: Target,
  trophy: Trophy,
  award: Award,
  crown: Crown,
  diamond: Diamond,
  gift: Gift,
  tag: Tag,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'credit-card': CreditCard,
  wallet: Wallet,
  package: Package,
  truck: Truck,
  shield: Shield,
  'shield-check': ShieldCheck,
  lock: Lock,
  key: Key,
  mail: Mail,
  phone: Phone,
  send: Send,
  'message-circle': MessageCircle,
  bell: Bell,
  calendar: Calendar,
  clock: Clock,
  timer: Timer,
  'alarm-clock': AlarmClock,
  user: User,
  users: Users,
  home: Home,
  'map-pin': MapPin,
  globe: Globe,
  book: Book,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'file-text': FileText,
  bookmark: Bookmark,
  briefcase: Briefcase,
  laptop: Laptop,
  monitor: Monitor,
  smartphone: Smartphone,
  code: Code,
  settings: Settings,
  search: Search,
  'pen-tool': PenTool,
  camera: Camera,
  image: Image,
  video: Video,
  film: Film,
  'play-circle': PlayCircle,
  music: Music,
  headphones: Headphones,
  mic: Mic,
  download: Download,
  share: Share2,
  'trending-up': TrendingUp,
  'chart-bar': ChartBar,
  activity: Activity,
  dumbbell: Dumbbell,
  leaf: Leaf,
  coffee: Coffee,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  smile: Smile,
  sparkle: Sparkle,
  flag: Flag,
  'help-circle': HelpCircle,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  'x-twitter': XBrand,
}

/** The icons offered before the full library is loaded (the hand-picked set above). */
export const ICON_NAMES = Object.keys(ICONS)

/* ---------------- The full Lucide library, loaded on demand ---------------- */

const kebab = (pascal: string) => pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase()
let libNames: string[] = ICON_NAMES
let tags: Record<string, string[]> = {}
let loading: Promise<void> | null = null
let version = 0
const subs = new Set<() => void>()

/**
 * About 1,500 more icons (the whole Lucide set, same line style) with their search keywords. Loaded only when the
 * picker opens or a page uses one of them; afterwards they live in ICONS like the hand-picked ones.
 */
export function loadIconLibrary(): Promise<void> {
  if (!loading) {
    loading = Promise.all([import('lucide-react'), import('./iconTags.json')]).then(([m, t]) => {
      const all = (m as unknown as { icons: Record<string, IconComp> }).icons
      // one entry per drawing: Lucide also lists old names for the same icon
      const seen = new Set<IconComp>(Object.values(ICONS))
      const listed: string[] = []
      for (const [name, comp] of Object.entries(all)) {
        const k = kebab(name)
        if (ICONS[k]) continue
        ICONS[k] = comp
        if (!seen.has(comp)) listed.push(k)
        seen.add(comp)
      }
      tags = (t as unknown as { default: Record<string, string[]> }).default
      libNames = [...ICON_NAMES, ...listed]
      version++
      subs.forEach((f) => f())
    })
  }
  return loading
}
export const iconLibraryLoaded = () => libNames !== ICON_NAMES
export const allIconNames = () => libNames
export const iconTags = (name: string) => tags[name] ?? []
/** Re-render when the full library arrives (icons that were missing can now be drawn). */
export function subscribeIcons(f: () => void) {
  subs.add(f)
  return () => void subs.delete(f)
}
export const iconsVersion = () => version
/** Any icon names a page uses that the hand-picked set does not have: load the library for them. */
export function ensureIcons(names: (string | undefined)[]) {
  if (names.some((n) => n && !ICONS[n])) void loadIconLibrary()
}
export const POPULAR_ICONS = ['check', 'check-circle', 'star', 'heart', 'arrow-right', 'chevron-right', 'lightbulb', 'rocket', 'gift', 'mail', 'phone', 'calendar', 'clock', 'user', 'shield-check', 'trophy']
