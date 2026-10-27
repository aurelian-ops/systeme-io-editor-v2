import { img, type Copy } from '../blocks'

/** Offline copy used when the AI service is unreachable, and as defaults the AI fills in. */

type Niche = 'coaching' | 'fitness' | 'course' | 'ebook' | 'webinar' | 'agency' | 'generic'

const NICHE_WORDS: Record<Exclude<Niche, 'generic'>, RegExp> = {
  fitness: /yoga|fitness|gym|workout|pilates|run|nutrition|diet|weight|coach(ing)? sport/i,
  coaching: /coach|mentor|therap|life|career|mindset|consult/i,
  course: /course|academy|class|training|lesson|teach|learn|formation|cours/i,
  ebook: /ebook|e-book|guide|pdf|book|checklist|template/i,
  webinar: /webinar|masterclass|live|workshop|event|summit/i,
  agency: /agency|studio|service|freelance|design|marketing|seo/i,
}

export function detectNiche(text: string): Niche {
  for (const [k, re] of Object.entries(NICHE_WORDS)) if (re.test(text)) return k as Niche
  return 'generic'
}

export function guessBrand(text: string) {
  const quoted = text.match(/(?:called|named|brand(?: is)?|for)\s+["“]?([A-Z][\w&' ]{2,28}?)["”]?(?:[,.]|\s(?:in|who|that|selling|to)\b|$)/)
  return quoted?.[1]?.trim()
}

export function quotedText(text: string) {
  return text.match(/["“]([^"”]{6,140})["”]/)?.[1]
}

const BASE: Record<Niche, Partial<Copy>> = {
  fitness: {
    eyebrow: '30-day program',
    headline: 'Feel stronger in 30 days, with 20 minutes a day',
    sub: 'Short guided sessions you can do at home. Clear cues, no equipment, built for real beginners.',
    cta: 'Get the free first class',
    bullets: ['20-minute sessions, 5 days a week', 'Clear form cues for every move', 'Progress you can feel by week two'],
    features: [
      { t: 'Short daily sessions', d: 'Twenty minutes that fit before work, after the kids sleep, or at lunch.' },
      { t: 'Coached like a live class', d: 'Every move is explained, with an easier and a harder option.' },
      { t: 'A plan, not a playlist', d: 'Each week builds on the last, so you always know what comes next.' },
      { t: 'Community check-ins', d: 'A weekly group call to ask questions and stay on track.' },
    ],
    stats: [
      { v: '4,800+', l: 'Members trained' },
      { v: '4.9/5', l: 'Average rating' },
      { v: '20 min', l: 'Per session' },
    ],
  },
  coaching: {
    eyebrow: '1:1 coaching',
    headline: 'Get clear on your next move in six weeks',
    sub: 'A focused coaching program for people who know they want a change but not yet which one.',
    cta: 'Book a free call',
    bullets: ['Six 1:1 sessions of 50 minutes', 'A written plan after every call', 'Message support between sessions'],
    features: [
      { t: 'A clear direction', d: 'Leave with one decision you trust, not ten options you doubt.' },
      { t: 'A plan you can follow', d: 'Weekly actions sized for a full calendar.' },
      { t: 'Someone in your corner', d: 'Message support between calls when you get stuck.' },
      { t: 'Honest feedback', d: 'Kind, direct, and focused on what moves you forward.' },
    ],
    stats: [
      { v: '320+', l: 'Clients coached' },
      { v: '6 weeks', l: 'Average program' },
      { v: '92%', l: 'Reach their goal' },
    ],
  },
  course: {
    eyebrow: 'Online course',
    headline: 'Learn the skill in weeks, not years',
    sub: 'A step-by-step video course with exercises, feedback and lifetime access.',
    cta: 'Join the course',
    bullets: ['42 short video lessons', 'Exercises with model answers', 'Lifetime access and updates'],
    features: [
      { t: 'Bite-size lessons', d: 'Videos under 10 minutes, so progress fits into any day.' },
      { t: 'Practice built in', d: 'Every module ends with an exercise and a model answer.' },
      { t: 'Learn at your pace', d: 'Lifetime access on phone, tablet and desktop.' },
      { t: 'Certificate', d: 'Share your result when you complete the final project.' },
    ],
    stats: [
      { v: '12,400+', l: 'Students' },
      { v: '42', l: 'Lessons' },
      { v: '4.8/5', l: 'Course rating' },
    ],
  },
  ebook: {
    eyebrow: 'Free guide',
    headline: 'The 12-page guide to getting your first 100 customers',
    sub: 'The exact steps, scripts and checklists, in one short PDF you can read tonight.',
    cta: 'Send me the guide',
    bullets: ['12 pages, no filler', 'Copy-paste scripts', 'A one-page checklist to print'],
    features: [
      { t: 'Read in 20 minutes', d: 'Twelve pages, written to be used, not admired.' },
      { t: 'Scripts included', d: 'Messages and emails you can copy, adapt and send today.' },
      { t: 'Checklist to print', d: 'One page that keeps you on track for the next 30 days.' },
      { t: 'Free updates', d: 'Get every new edition in your inbox.' },
    ],
    stats: [
      { v: '25,000+', l: 'Downloads' },
      { v: '12', l: 'Pages' },
      { v: '20 min', l: 'Read time' },
    ],
  },
  webinar: {
    eyebrow: 'Free live masterclass',
    headline: 'How to launch your offer in 14 days',
    sub: 'A 60-minute live session with a full walkthrough and a Q&A at the end.',
    cta: 'Save my seat',
    bullets: ['60 minutes, live', 'Full walkthrough with real examples', 'Replay sent to everyone who signs up'],
    features: [
      { t: 'The 14-day plan', d: 'What to do each day, in the order that matters.' },
      { t: 'Real examples', d: 'Pages and emails from launches that worked, taken apart.' },
      { t: 'Live Q&A', d: 'Bring your offer and get feedback on the spot.' },
    ],
    stats: [
      { v: '60 min', l: 'Live session' },
      { v: '3,100+', l: 'Attended so far' },
      { v: 'Free', l: 'Replay included' },
    ],
  },
  agency: {
    eyebrow: 'Studio',
    headline: 'Websites that bring in clients, delivered in three weeks',
    sub: 'Strategy, design and build for small businesses that are tired of a site that does nothing.',
    cta: 'Get a proposal',
    bullets: ['Fixed price, fixed timeline', 'Copywriting included', '30 days of support after launch'],
    features: [
      { t: 'Strategy first', d: 'We start with who you sell to and what they need to hear.' },
      { t: 'Design that converts', d: 'Every page has one job and is built around it.' },
      { t: 'Launch in three weeks', d: 'A clear plan with a review at the end of each week.' },
    ],
    stats: [
      { v: '140+', l: 'Sites launched' },
      { v: '3 weeks', l: 'Average delivery' },
      { v: '2.4x', l: 'More enquiries' },
    ],
  },
  generic: {
    eyebrow: 'New',
    headline: 'Everything you need to get started, in one place',
    sub: 'A simple way to reach your goal faster, with guidance at every step.',
    cta: 'Get started',
    bullets: ['Set up in minutes', 'Guidance at every step', 'Cancel any time'],
    features: [
      { t: 'Simple to start', d: 'Set up in minutes, with a guide at every step.' },
      { t: 'Built for results', d: 'Every feature is there to get you to the outcome faster.' },
      { t: 'Support that answers', d: 'Real people, replies within a working day.' },
    ],
    stats: [
      { v: '10,000+', l: 'Customers' },
      { v: '4.8/5', l: 'Rating' },
      { v: '24h', l: 'Support reply' },
    ],
  },
}

export function makeCopy(prompt: string, brand?: string): Copy {
  const niche = detectNiche(prompt)
  const b = BASE[niche]
  const name = brand || guessBrand(prompt) || 'Your brand'
  const seed = niche + name
  const quoted = quotedText(prompt)
  return {
    brand: name,
    eyebrow: b.eyebrow!,
    headline: quoted ?? b.headline!,
    sub: b.sub!,
    cta: b.cta!,
    ctaNote: 'Free. No card needed.',
    heroImage: img(seed + 'hero', 1600, 900),
    bullets: b.bullets!,
    features: b.features!,
    steps: [
      { t: 'Sign up', d: 'Enter your email and get instant access.' },
      { t: 'Follow the plan', d: 'Short steps, one at a time, at your own pace.' },
      { t: 'See the result', d: 'Most people see a clear change within the first two weeks.' },
    ],
    testimonials: [
      { q: 'I put it off for months. It took me one weekend and I wish I had started sooner.', a: 'Camille R.', r: 'Lyon' },
      { q: 'Clear, short and practical. Exactly what I needed, nothing I didn’t.', a: 'Marcus T.', r: 'Toronto' },
      { q: 'The first thing in years I actually finished. The structure makes it easy.', a: 'Aïcha B.', r: 'Brussels' },
    ],
    stats: b.stats!,
    plans: [
      { name: 'Starter', price: '€29', period: 'one time', features: ['Full access', 'All updates', 'Email support'], cta: 'Choose Starter' },
      {
        name: 'Complete',
        price: '€79',
        period: 'one time',
        features: ['Everything in Starter', 'Weekly group calls', 'Private community', 'Bonus templates'],
        cta: 'Choose Complete',
        featured: true,
      },
    ],
    faqs: [
      { q: 'Who is this for?', a: 'Anyone starting out who wants a clear path and real results without wasting months.' },
      { q: 'How long do I get access?', a: 'For life, including every future update.' },
      { q: 'What if it is not for me?', a: 'Email us within 30 days for a full refund. No questions asked.' },
      { q: 'Do I need any experience?', a: 'No. Everything is explained from the very first step.' },
    ],
    about: {
      t: `Hi, I’m the person behind ${name}`,
      d: 'I started this after years of watching people struggle with advice that was too long, too vague or too expensive. Everything here is what I wish I had at the start.',
      img: img(seed + 'about', 900, 1100),
    },
    ctaHeadline: 'Ready when you are',
    ctaSub: 'Join today and get started in the next five minutes.',
    logos: ['Northwind', 'Lumen', 'Atlas & Co', 'Kinfolk', 'Meridian'],
  }
}

export function planForPrompt(prompt: string): { kind: string; variant: number }[] {
  const n = detectNiche(prompt)
  const sell = /sell|price|pricing|buy|offer|course|program|vendre|€|\$/i.test(prompt)
  const lead = /email|lead|opt.?in|subscribe|free|newsletter|download|waitlist/i.test(prompt)
  const plan: { kind: string; variant: number }[] = [{ kind: 'header', variant: 0 }]
  plan.push({ kind: 'hero', variant: lead && !sell ? 2 : n === 'agency' ? 1 : 0 })
  plan.push({ kind: 'logos', variant: 0 })
  plan.push({ kind: 'features', variant: n === 'ebook' ? 1 : 0 })
  if (n !== 'ebook') plan.push({ kind: 'steps', variant: 0 })
  plan.push({ kind: 'testimonials', variant: n === 'coaching' ? 1 : 2 })
  if (n === 'coaching' || n === 'agency') plan.push({ kind: 'about', variant: 0 })
  if (sell) plan.push({ kind: 'pricing', variant: 0 })
  if (n === 'webinar') plan.push({ kind: 'countdown', variant: 0 })
  plan.push({ kind: 'faq', variant: 0 })
  plan.push({ kind: 'cta', variant: lead ? 0 : 1 })
  plan.push({ kind: 'footer', variant: 0 })
  return plan
}
