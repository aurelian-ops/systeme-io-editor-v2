export type Device = 'desktop' | 'tablet' | 'mobile'
export const DEVICES: Device[] = ['desktop', 'tablet', 'mobile']
export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 }
export const DEVICE_LABEL: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }

export type NodeType =
  | 'section'
  | 'row'
  | 'column'
  | 'headline'
  | 'text'
  | 'eyebrow'
  | 'button'
  | 'image'
  | 'list'
  | 'form'
  | 'faq'
  | 'countdown'
  | 'divider'
  | 'video'
  | 'quote'
  | 'price'
  | 'logos'
  | 'stat'
  | 'spacer'
  // V1 elements
  | 'contentbox'
  | 'input'
  | 'checkbox'
  | 'recaptcha'
  | 'calendar'
  | 'paybutton'
  | 'product'
  | 'audio'
  | 'icon'
  | 'carousel'
  | 'xshare'
  | 'survey'
  | 'menu'
  | 'rawhtml'

export type Align = 'left' | 'center' | 'right'
export type SectionTone = 'light' | 'muted' | 'dark' | 'brand'
export type Sides = [number, number, number, number] // top, right, bottom, left
export type Corners = [number, number, number, number] // top-left, top-right, bottom-right, bottom-left
export type ShadowPreset = 'none' | 'soft' | 'mid' | 'hard' | 'far' | 'sm' | 'md' | 'lg'
export type BorderType = 'none' | 'full' | 'bottom' | 'top' | 'topbottom'
export type BorderStyle = 'solid' | 'dotted' | 'dashed'

export interface Hover {
  color?: string
  background?: string
  subtextColor?: string
  movement?: number
}

export interface Style {
  /* typography */
  fontSize?: number
  fontWeight?: number
  /** px when > 4, otherwise a multiplier of the font size */
  lineHeight?: number
  /** px */
  letterSpacing?: number
  fontFamily?: string
  textAlign?: Align
  color?: string
  textBackground?: string
  /* box */
  background?: string
  backgroundImage?: string
  contentBackground?: string
  overlay?: string
  blur?: number
  paddingY?: number
  paddingX?: number
  /** per-side padding; wins over paddingY/paddingX when set */
  pad?: Sides
  marginY?: number
  marginX?: number
  mar?: Sides
  gap?: number
  radius?: number
  radii?: Corners
  borderType?: BorderType
  borderStyle?: BorderStyle
  borderWidth?: number
  borderColor?: string
  /** legacy simple border toggle */
  border?: boolean
  shadow?: ShadowPreset
  /* sizing */
  maxWidth?: number
  width?: number
  height?: number
  minHeight?: number
  fullWidth?: boolean
  columns?: number
  /** column widths in twelfths, one per column (rows only) */
  colWidths?: number[]
  vAlign?: 'start' | 'center' | 'end' | 'stretch'
  reverse?: boolean
  noStack?: boolean
  /* element-specific visual values */
  iconSize?: number
  iconColor?: string
  /** a list marker's background (the circle behind its number or icon) and its shape */
  markerBg?: string
  markerShape?: 'circle' | 'rounded' | 'square' | 'none'
  /** space between a list's marker and its text */
  markerGap?: number
  subtextSize?: number
  subtextColor?: string
  subtextFontFamily?: string
  /* form input placeholder / calendar colours */
  placeholderColor?: string
  titleColor?: string
  /** a product's price colour, and the colour of its selected option */
  priceColor?: string
  accentColor?: string
  fieldColor?: string
  slotBackground?: string
  slotActiveBackground?: string
  hover?: Hover
  /* survey answers / menu links */
  answerSize?: number
  answerColor?: string
  answerBackground?: string
  outlineColor?: string
  activeColor?: string
  underlineColor?: string
  /** a menu item shown as a button: its fill and its text (the accent by default) */
  buttonBackground?: string
  buttonColor?: string
  /** stacking: an element that overlaps another (a card floating over a photo) sits above it */
  layer?: number
  /** where a background photo is anchored ("right center", "center top"…) */
  bgPosition?: string
  /* behaviour */
  hidden?: boolean
  delay?: number
}
export type StyleKey = keyof Style

export interface Styles {
  desktop: Style
  tablet?: Style
  mobile?: Style
}

export interface FaqItem {
  q: string
  a: string
}
export type FieldType =
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'country'
  | 'city'
  | 'street'
  | 'postcode'
  | 'state'
  | 'company'
  | 'website'
  | 'neighborhood'
  | 'street_number'
  | 'tax_number'
  | 'custom'
export interface FormField {
  type: FieldType
  label: string
  optional?: boolean
}

export type ButtonAction = 'submit' | 'popup' | 'url' | 'next' | 'download'
export interface Automation {
  action: string
  value?: string
}
export interface MenuItem {
  label: string
  href: string
  newWindow?: boolean
  /** shown as a button: after the links on desktop, at the bottom of the dropdown on phones (a header's call to action) */
  button?: boolean
  /** a submenu (V1): its links open under this item on hover, or in place on phones */
  sub?: MenuItem[]
  hasSub?: boolean
}
export interface SurveyQuestion {
  title: string
  subtitle?: string
  /** plain text (older pages) or an answer with its tag; an open answer lets visitors type their own (and has no tag) */
  answers: (string | SurveyAnswer)[]
}
export interface SurveyAnswer {
  text: string
  tag?: string
  open?: boolean
}
export interface Slide {
  src: string
  /** older pages only: slides no longer show a caption */
  caption?: string
}

export interface Props {
  /** A block's own colours (CSS colour variables), used while its section has a background colour. */
  palette?: Record<string, string>
  text?: string
  subtext?: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
  href?: string
  items?: string[]
  faq?: FaqItem[]
  src?: string
  alt?: string
  aspect?: number
  fields?: FormField[]
  buttonText?: string
  note?: string
  endsAt?: number
  name?: string
  price?: string
  period?: string
  features?: string[]
  featured?: boolean
  author?: string
  role?: string
  value?: string
  label?: string
  tone?: SectionTone
  minCol?: number
  /** the empty row a new section comes with (the first layout added replaces it) */
  starter?: boolean
  /** columns removed from a row, with the elements that were moved out of them (adding columns back restores them) */
  parked?: { col: Node; moved: string[] }[]
  kind?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: string
  /** a list's markers: its icon (default) or numbers 1, 2, 3… */
  marker?: 'icon' | 'number'
  iconAfter?: string
  /* button / image / icon behaviour */
  action?: ButtonAction | 'none'
  url?: string
  popupId?: string
  fileName?: string
  redirect?: 'next' | 'url' | 'none'
  redirectUrl?: string
  /** what a form shows after a successful sign-up (when it does not redirect) */
  successHeading?: string
  successText?: string
  successTextColor?: string
  successIconColor?: string
  successBg?: string
  doubleOptIn?: boolean
  automations?: Automation[]
  newWindow?: boolean
  /** set on the root of a master block instance */
  masterId?: string
  /* section */
  sticky?: boolean
  stickyPosition?: 'top' | 'bottom'
  /* content box */
  headerVisible?: boolean
  title?: string
  /* form */
  layout?: 'stacked' | 'inline'
  /** Design tab, Fields > Customize */
  fieldStyle?: Style
  /** Design tab, Button > Customize */
  btnStyle?: Style
  buttonPosition?: 'left' | 'center' | 'right' | 'full'
  /* inputs */
  inputType?: FieldType
  placeholder?: string
  optional?: boolean
  message?: string
  /* recaptcha / video / audio */
  theme?: 'light' | 'dark'
  videoType?: 'youtube' | 'vimeo' | 'upload' | 'direct' | 'embed'
  /** an uploaded video file (Upload file) and the picture shown before it plays */
  videoFile?: string
  videoName?: string
  /** an uploaded audio file (Upload audio file) */
  audioFile?: string
  audioName?: string
  poster?: string
  autoplay?: boolean
  controls?: boolean
  /* countdown */
  /** fixed: a date and time · delay: days / hours / minutes / seconds after the visitor arrives · daily: a time every day ·
   * funnel: the funnel step's deadline · minutes: older pages (minutes after arrival) */
  countdownType?: 'fixed' | 'delay' | 'daily' | 'funnel' | 'minutes'
  minutes?: number
  delayDays?: number
  delayHours?: number
  delayMinutes?: number
  delaySeconds?: number
  /** daily countdown: the time it ends each day, "HH:MM" */
  dailyTime?: string
  expireAction?: 'nothing' | 'redirect'
  /* menu / survey / carousel / share / html */
  menu?: MenuItem[]
  questions?: SurveyQuestion[]
  finalText?: string
  slides?: Slide[]
  arrows?: boolean
  /** menu on phones: a menu button that opens the links (default), or the links shown in a row */
  burger?: boolean
  tweet?: string
  html?: string
  /* faq */
  showIcons?: boolean
  /** an FAQ answer (a column of elements): the question it answers */
  question?: string
  /** the recipe a section was built from (the AI's premium structures) */
  recipe?: string
  /** what the recipe was built with, and which part of it an element holds (to change layout keeping content) */
  recipeCopy?: Record<string, unknown>
  recipeKnobs?: Record<string, unknown>
  slot?: string
  /** illustrative proof the AI wrote (a quote, a number, a logo): flagged in the editor until replaced with a real one */
  sample?: boolean
  /** how the element moves on the live page (never in the editor, never for visitors who ask for less motion) */
  motion?: Motion
  /* product / calendar / payment: sample data in the prototype */
  quantity?: boolean
  timeFormat?: '12' | '24'
  headline2?: string
  /* calendar: form step and thank-you step */
  subheadline2?: string
  submitText?: string
  event?: string
}

export interface Node {
  id: string
  type: NodeType
  props: Props
  style: Styles
  children?: Node[]
}

export interface Theme {
  preset: string
  primary: string
  onPrimary: string
  ink: string
  muted: string
  bg: string
  surface: string
  line: string
  dark: string
  fontHeading: string
  fontBody: string
  radius: number
  headingWeight: number
  headingTracking: number
}

export interface Popup {
  id: string
  name: string
  enabled: boolean
  closeButton: boolean
  auto: boolean
  delay: number
  exitIntent: boolean
  width: number
  headline: string
  text: string
  buttonText: string
  note: string
  style: Style
}

export interface PageSettings {
  fontSize: number
  lineHeight: number
  linkColor?: string
  textColor?: string
  align: Align
  headingColor?: string
  headingAlign?: Align
  language: string
  background?: string
  backgroundImage?: string
  backgroundBlur: number
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  seoAuthor: string
  socialImage?: string
  noIndex: boolean
  fbEvent: string
  headerCode: string
  footerCode: string
  affiliateBadge: boolean
  /** the page's animations (entrances, parallax…) play on the live page; off shows everything at once */
  animations?: boolean
}

export interface SavedBlock {
  id: string
  name: string
  node: Node
  /** shared everywhere it is used: editing one updates all */
  master?: boolean
}

/** Entrance presets: played once when the element scrolls into view. */
export type MotionEnter = 'fade' | 'fade-up' | 'fade-down' | 'slide-left' | 'slide-right' | 'scale' | 'blur' | 'clip' | 'zoom'

export interface Motion {
  enter?: MotionEnter
  /** its items appear one after another (a row's columns, a column's elements, a list's lines) */
  stagger?: boolean
  speed?: 'quick' | 'normal' | 'slow'
  hover?: 'lift' | 'grow'
  /** parallax: a photo (or a section's background photo) drifts slower than the page; sticky: a column stays in view
   * while the other scrolls; marquee: its items slide by in an endless line (logos, words, short quotes) */
  scroll?: 'parallax' | 'sticky' | 'marquee'
  /** numbers in it count up from zero */
  count?: boolean
  /** its words appear as if typed */
  typing?: boolean
  /** an animation the presets don't cover (written by the AI): CSS keyframes, played on entrance */
  /** trigger 'scroll' ties it to the scroll position (it plays as the element crosses the screen) instead of playing once */
  custom?: { keyframes: string; duration?: number; easing?: string; split?: 'letters' | 'words'; trigger?: 'enter' | 'scroll'; label?: string }
}

/** One look the AI proposes for a new page (the user picks one of four before it builds). */
export interface Direction {
  name: string
  feeling?: string
  fontHeading: string
  fontBody: string
  bg: string
  surface?: string
  ink: string
  muted?: string
  accent: string
  onAccent?: string
  radius?: number
  hero?: string
  /** a short headline in this look's voice, shown on its card */
  sample?: string
  why?: string
}

/**
 * What the AI knows about this page and its business, kept with the page and updated after every message,
 * so a long conversation never loses what was said (the AI's memory).
 */
export interface PageBrief {
  business?: string
  offer?: string
  price?: string
  audience?: string
  pains?: string[]
  desires?: string[]
  objections?: string[]
  proof?: string[]
  voice?: string
  /** the one thing a visitor should do on this page */
  goal?: string
  pageType?: string
  /** the visual direction picked for the page (from the design skill) */
  direction?: string
  language?: string
  /** the look the user picked before the build (fonts and colours), applied exactly */
  look?: Direction
  /** the page's photo art direction (one concept, casting, place, light, camera, grade), used for every photo */
  shoot?: { concept?: string; casting?: { id: string; desc: string; wardrobe?: string }[]; location?: string; light?: string; camera?: string; grade?: string; avoid?: string }
  /** the photo of each cast person made first, the reference for the others (by casting id) */
  anchors?: Record<string, string>
  /** the user's logo (an uploaded image), used in the header and footer */
  logo?: string
  /** every image the user uploaded in the chat, kept so they never have to send it again */
  assets?: { url: string; note?: string }[]
  /** photos on the page: created by the AI, or added by the user (asked once per page) */
  photos?: 'ai' | 'own'
  /** what the user decided or asked to keep / avoid ("no countdown", "keep this headline") */
  decisions?: string[]
}

/** The AI's plan for the page: the promise, the angle and each section's job. */
export interface PagePlan {
  promise?: string
  angle?: string
  /** the whole page as the AI wrote it (designed sections and their words), built when the answers don't change it */
  page?: unknown
  sections?: { name: string; job: string }[]
}

export interface PageDoc {
  title: string
  theme: Theme
  sections: Node[]
  smartResponsive: boolean
  brief?: PageBrief
  plan?: PagePlan
  /** legacy single popup (migrated into popups) */
  popup?: unknown
  popups?: Popup[]
  settings?: PageSettings
  stepType?: string
}

export interface Checkpoint {
  id: string
  label: string
  source: 'you' | 'ai'
  at: number
  doc: PageDoc
}
