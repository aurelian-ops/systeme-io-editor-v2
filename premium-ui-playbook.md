 # Premium UI Playbook

How the Whosprinting app went from "sloppy, AI-made" (a tester, Oct 2026) to "premium": the rules, the exact values, the process, and every source. Written to be reused on another project.

---

## 1. The idea in one line

Premium is not decoration. It is **consistency + calm + motion that answers the hand**. Copy the *behaviour* of the best products (Linear, Vercel, Raycast, Apple), never their look, and never invent ornaments.

---

## 2. What makes a UI read as "AI-made" (never do these)

Testers and the owner rejected each of these as "AI slop":

- Glows, colour blobs, gradient rings, gradient text, gradient boxes
- Sparkle icons on inputs ("✨ Ask AI")
- Dashed pills, boxed badges, a box inside a box
- Stacks of identical icon cards ("feature grid")
- Tinted dark mode greys (blue-grey, green-grey)
- "Clever" upsell decoration (engraved cards, shiny borders, timers)
- Template text that looks filled in ("{niche} creators") or numbers that change with no meaning
- Motion everywhere, or motion that replays on every filter change

**Rule:** abstract briefs ("minimal, Apple-style") failed three times. **Show 3 or 4 options, each modelled on a named real product, and let the owner pick.** That landed at once every time.

---

## 3. Visual identity (decisions that held)

| Area | Decision | Modelled on |
|---|---|---|
| Dark mode | Pure neutral greys, no hue in any surface or text. Colour only means something (a win, a rise, a link, a live dot), which is why it reads strong. | Vercel Geist, "Graphite" |
| Accent | One brand colour, used rarely: wins, rises, links, live states | Linear |
| Paid feature colour | One colour reserved for "paid" only (gold). Never used for anything else. | |
| Locked control | The normal control, slightly dimmer, + a lock + the small plan name. Not a new style. | Linear, Raycast |
| Sidebar plan card | Quiet: one title, the single most useful true line, one button, a thin edge | Linear |
| Upgrade card | Opens only when the user clicks something locked. Names what they tried, 4 features, price, 1 button. Nothing on a timer. | Raycast Pro |
| Settings | Sections, not cards: title + one line on the left, controls on the right, hairlines between | Linear / Vercel settings |
| The "one light" | One single signature effect in the whole product (a soft light gliding around the main search box border every ~9 s). Reused, never a second effect. | |
| Pills | One soft tag primitive (20px, radius 5, fill, 12px/500, no border), max one per card or row; every other fact is plain text in a "·" line | |
| Numbers | Tabular figures everywhere. Estimates always a range ("€12K – €24K"), low confidence shown as "≈ …" in a lighter ink, explanation in a tooltip | |

### Tokens (light / dark), as used

```css
:root {
  --bg: #f5f5f6;  --raised: #ffffff;
  --t1: #171717;  --t2: #4d4d4d;  --t3: #6b6b6b;  --t4: #a3a3a3;
  --line: rgba(0,0,0,.07);  --fill-1: rgba(0,0,0,.04);  --fill-2: rgba(0,0,0,.07);
  --ink: #171717;  --inv: #ffffff;
  --brand: #35ab45;  --ok: #237a31;  --oktint: #dcf3de;  --dng: #b04a3e;
  --gold: #d4a93a;  --goldink: #8f6a0e;
  --shadow-card: 0 0 0 1px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-pop: 0 0 0 1px rgba(0,0,0,.08), 0 4px 8px -2px rgba(0,0,0,.08), 0 16px 32px -8px rgba(0,0,0,.16);
}
[data-theme="dark"] {
  --bg: #0a0a0a;  --raised: #151515;
  --t1: #ededed;  --t2: #a3a3a3;  --t3: #7d7d7d;  --t4: #4d4d4d;
  --ink: #ededed;  --inv: #0a0a0a;  --brand: #4fc95f;  --ok: #4fc95f;
}
```

Shadow = a 1px ring + soft drop, not a border + shadow. That one change makes cards feel "made".

### Type and spacing scale

- Display 40/44 600 −2% · H1 28/34 600 −1.5% · H2 20/26 600 −1% · H3 16/22 600 · Body 13/20 · Small 12/18 · Caption 11/16 500
- UI font: Geist (or Inter). Marketing headlines: a display face (Bricolage Grotesque).
- Space: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Radius: 4 · 6 · 8 · 12 · 999.

---

## 4. Motion system (the biggest single upgrade)

One shared motion layer; nobody hand-rolls timing.

### Curves

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);    /* anything entering or answering a click */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* panels and sheets (the iOS sheet curve) */
--ease-spring: cubic-bezier(0.32, 0.72, 0, 1);    /* fallback */
@supports (transition-timing-function: linear(0, 1)) {
  :root {
    /* damped spring: ratio 0.8, ~1.5% overshoot, settled by 85% */
    --ease-spring: linear(0, 0.016 2%, 0.058 4%, 0.118 6%, 0.19 8%, 0.268 10%, 0.348 12%, 0.427 14%,
      0.503 16%, 0.574 18%, 0.64 20%, 0.728 23%, 0.801 26%, 0.86 29%, 0.906 32%, 0.952 36%, 0.982 40%,
      1 44%, 1.01 48%, 1.015 53%, 1.015 58%, 1.012 64%, 1.008 70%, 1.005 77%, 1.002 85%, 1);
  }
}
```

### Durations and rules

- Hover 120 ms. Panels 200 to 320 ms. **Never over 340 ms.**
- List the properties you transition. **Never `transition-all`.**
- Spring only for things that *travel* (side panel 320 ms, phone sheets 300 ms, hover cards, dialogs, big popovers). Menus, tooltips and presses keep `--ease-out`.
- **Press feedback** on every hand-made clickable control (not on whole cards or rows):
  ```css
  .press { transition-property: color, background-color, border-color, box-shadow, opacity, transform;
           transition-duration: 120ms; transition-timing-function: var(--ease-out); }
  .press:active:not(:disabled) { transform: scale(0.97); }
  ```
- Popovers grow from **0.96** at their trigger (origin-aware). Side panels slide from the right. Toasts fade out.
- Hover cards wait for intent (**280 ms**) and fade out. Tooltips wait **160 ms**, then open instantly for 500 ms after one closes ("warm" tooltips, like macOS).
- Tabs and segmented controls: **one sliding indicator**, not a jump.
- Images fade in on load. Skeletons fade in after **140 ms** (fast loads never flash a skeleton).
- **No motion on high-frequency keyboard UI**: the ⌘K palette opens instantly; J/K paging and filter changes never replay an entrance.
- A keyframe on an element containing `position: fixed` children uses `backwards` fill, never `both`/`forwards` (or the fixed children break).
- Respect `prefers-reduced-motion` everywhere.
- Endless loops (marketing site) always have a pause button and pause on hover.

---

## 5. "Feels instant" techniques (premium = zero waiting)

- **Hover prefetch**: when the pointer rests 150 ms on a row/card (mouse only, never on Save-Data), prefetch what its panel draws first. Measured: 12/12 panel opens with no skeleton, against 12/12 skeletons before.
- **Every route has a loading skeleton that mirrors the layout box for box** (same header, same grid). The skeleton must match the new design every time the design changes.
- A thin **top progress line** on page change.
- **Never a white screen**: a server redirect during navigation draws nothing. Make in-app links already carry the final URL so no redirect happens.
- Open results **in place**, not in a new tab (a new tab is a cold load: 1 to 3 s white), and keep the user's context (reopening the search shows the same answer).
- Phone sheets: **drag to dismiss** (pull from the header or from content scrolled to the top; past 25% of height or faster than 0.5 px/ms it closes on the spring, else springs back).
- Optional next level: View Transitions shared-element morph (card → panel), CSS scroll-driven details.

---

## 6. Interaction rules (users notice these)

- **Every action gives feedback**: a short past-tense toast ("Added to “Launch board”"), with Undo when reversible.
- **Destructive actions confirm first** (filled danger button, explicit verb, body says what is lost), then toast.
- Serious but non-destructive actions confirm in the neutral style with a body that says what will happen.
- **No confirmation for light toggles** (follow, favourite, filters, sort, theme): just a toast with Undo.
- **No placeholder controls.** Every visible button does something real, or it is removed.
- **Every lock names its plan** and opens the upgrade card. Upgrades are asked, never pushed. Nothing opens on a timer.
- Every page has a teaching empty state (illustration + title + body + action), not "No results".
- Every module has a "How to": dim the page, cut out the target, small card "2 of 4", Back / Next / Done, arrow keys, Esc.
- Copy: short declarative lines, one idea each, real numbers, plain words. No em dashes in UI copy.

---

## 7. Design system discipline (the root cause of "sloppy")

The app was built by many parallel agents; each re-made the pill locally, so the same pill existed in **11 slightly different versions**. That is what testers felt as "sloppy".

- One primitive per pattern: Button, Pill, Card/`cardPlate()`, Table (Frame/HeadRow/Row/ListRow), SectionHeader, Dialog family, FilterChip, Segmented, Tooltip, Skeleton.
- Before writing markup, look for the primitive. Close but not enough → add a prop/variant. Missing and will repeat → create it in the kit and document the rule.
- **Never copy a block of Tailwind classes from another module.** Two copies of one recipe is the bug.
- Automated checks fail the build on: hard-coded hex colours, a hand-rolled pill, a loop without a pause control, an icon name not in the map, etc.

---

## 8. The process that produced it

1. **Collect tester reviews** one by one; classify each as bug, misunderstanding or change. Fix only the point raised.
2. **Research the best real products** (sources below), extract *rules with numbers*, not moods.
3. **Build one shared layer first** (tokens, curves, press, popover/panel animations, tooltips), then apply it module by module (8 parallel module agents, each with the same brief).
4. **Screenshot every change at 1440, 1024 and 390, light and dark**, read them, fix what is off, before calling it done. Then screenshot production again.
5. **Measure feel with numbers**: time to first paint after a click, white-screen time, frozen main-thread time on a 4× slowed CPU, skeleton-or-not on panel opens.
6. When the owner says "still standard", propose **distinctive** techniques (spring curves, hover prefetch, shared-element morph, drag-to-dismiss), not more best practice.

---

## 9. Sources

### Motion and interaction craft
- Emil Kowalski, *Great animations*: https://emilkowal.ski/ui/great-animations
- Emil Kowalski, *7 practical animation tips*: https://emilkowal.ski/ui/7-practical-animation-tips
- Rauno Freiberg, *Interaction design* (Vercel): https://rauno.me/craft/interaction-design
- Rauno Freiberg, profile/notes: https://yespress.io/rauno-freiberg.md
- Chrome, *Entry and exit animations* (`@starting-style`, `transition-behavior`): https://developer.chrome.com/blog/entry-exit-animations

### Guidelines and design systems
- Vercel, *Web Interface Guidelines*: https://vercel.com/design/guidelines
- Vercel Geist, colours: https://vercel.com/geist/colors
- Vercel Geist, typography: https://vercel.com/geist/typography
- Apple Human Interface Guidelines, *Materials*: https://developer.apple.com/design/human-interface-guidelines/materials
- Radix Colors, *Understanding the scale*: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix Colors, *Usage*: https://www.radix-ui.com/colors/docs/overview/usage
- Radix Themes, colour: https://www.radix-ui.com/themes/docs/theme/color

### Product references (studied for the picks)
- Linear, *How we redesigned the Linear UI*: https://linear.app/now/how-we-redesigned-the-linear-ui
- Linear, *Behind the latest design refresh*: https://linear.app/now/behind-the-latest-design-refresh
- Attio (data-dense CRM done calmly): https://attio.com
- Raycast Pro upgrade flow (opened only from a locked action)

### View transitions (next-level option)
- React View Transitions demo: https://react-view-transitions-demo.labs.vercel.dev
- Source: https://github.com/vercel-labs/react-view-transitions-demo
- Vercel agent skill: https://skills.sh/vercel-labs/agent-skills/vercel-react-view-transitions

### Speed as part of "premium"
- Chrome UX Report methodology: https://developer.chrome.com/docs/crux/methodology/
- CrUX rank magnitude: https://developer.chrome.com/blog/crux-rank-magnitude
