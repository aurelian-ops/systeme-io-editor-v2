# Interactive waits: toys to play with while the AI writes (Oct 2026)

Our case: 40-90 s while the page is written. Prototype: a ball thrown around the empty page that rolls into the sign-up button. Goal: interactive, real visuals, no scores, ends up as the page. Companion: `loading-states-2026.md` (progress, steps, skeletons).

## Examples by product (what is on screen, how it responds)

- **Chrome Dino** (chrome://dino, 2014): space to jump; 270M games/month (2018). One key, zero load.
- **ChatGPT Snake** (Sept 2026, Images 2.5 note): click the loading animation, steer a snake over the dot grid until the image lands. Some users only; not in Work mode; controls undocumented. An easter egg, not the default wait.
- **Google Pac-Man doodle** (2010): +36 s per visit, 4.8M hours (RescueTime); its founder guessed 75% never saw it was playable. The toy must announce itself.
- **Namco patent 5,718,632** (expired 27 Nov 2015): Ridge Racer ran Galaxian during loads, winning gave in-game bonuses. Bayonetta let you practise real combos while loading: the wait toy is the product.
- **Apple Watch honeycomb**: drag with inertia and rebound; bubbles shrink toward the edge; a pressed bubble shrinks and neighbours lean toward it (reverse-engineered, Apple's maths unverified). watchOS 27 made it optional.
- **Siri, iOS 18.1**: edge glow pulses with the voice, never blocks typing. **iOS 26 Liquid Glass**: the clock refracts the wallpaper; readability complaints forced a translucency slider. **Android 15 "Landroid"**: drag to steer a ship, land on planets (single source).
- **Figma cursor chat**: `/` pins a bubble to the cursor, live text, lingers 5 s, 52 chars. **PartyKit Cursor Party** (not "Igloo": nothing found): other visitors' cursors in one script line.
- **Stripe globe** (2020 blog): ~20k twinkling dots, arcs between countries, drag to spin, auto-rotate; 60 fps or a static image; antialiasing off; paused while scrolling.
- **Vercel** (rauno.me/craft/vercel): "dropped any animation or interaction that performed poorly, felt pompous, or fell out of rhythm." Cursor-reactive dot grids on Vercel/Linear: not confirmed; they exist as Framer components ("Reactive Dots" lean toward the cursor; "Magnetic Dots Grid" pushed away, spring back).
- **WebGL Fluid Simulation** (PavelDoGreat, MIT, ~14k stars): the pointer injects dye and velocity; runs on mobile; cloned as Framer "Liquid" and 21st.dev "Splash Cursor".
- **Matter.js piles** (Framer): "Gravi" drag-and-throw images, "GravityPills" squash on impact, "Text Pile Scatter" letters fall then rebuild on hover; WordPress "Throwable" drops real headings and buttons.
- **Particle text** (21st.dev, Framer "Particle Text Pro FX"): pointer repels, springs return; intro flies particles in to form the text; reduced-motion option.
- **Magnetic buttons** (Codrops 2020, after Cuberto): the button slides toward the pointer inside a radius, eases back.
- **Comeau "boop"**: on hover the element springs (tension 300, friction 10), returns after 150 ms; "it works because it's rare"; reduced motion = none.
- **Lovable**: the preview updates live while the agent works. **Active Theory**: "when WebGL appears merely as decoration, it becomes noise."
- Not found: Arc easter eggs, Nintendo loaders beyond Namco, Resn/Teenage Engineering, Dynamic Island springs, WWDC26 gestures.

## What makes a toy delightful vs cheap

- **Occupied time feels shorter** (Maister 1985; Block & Zakay attentional gate), but **over-complex stimuli backfire** (Pruyn & Smidts 1998).
- **Interactive beats passive**: Hohenstein et al., CHI EA 2016: interactive animation felt faster and was liked more than a bar or passive animation (secondhand). Cheng et al., BIT 2024: the gain is largest on long waits; colour-changing beat greyscale. Zhao 2017: passive animation felt longer than a blank screen (secondhand).
- **Show the work** (Buell & Norton 2011): a visible list of airlines searched beat a bar, +8% value. The toy sits beside the work, never hides it.
- **Fluid rules** (Apple WWDC18 803, via Gitter): respond on press, keep the grab offset, 1:1 tracking, inherit velocity on release, every motion interruptible. Springs, not timed tweens.
- **Restraint** (NN/g): 100-500 ms; the more frequent, the subtler; parallax "frustrating, dizzying"; excess motion is an accessibility issue. Comeau: "delight is subjective".
- **Rare, discoverable, finite**: boop works because it is rare; Pac-Man lost 75% because it hid; a toy that outlives the wait is clutter.
- **Honest ending**: Namco rewarded play in the main game; Bayonetta made play the real mechanic. The best toys leave a trace in the result.

## Candidate ideas: play while it writes, then it becomes the page (ranked)

1. **Throwable section cards.** As the outline streams, cards (Hero, Benefits, FAQ, Form) drop in; drag and throw, they bounce and squash (Matter.js). When a section's content lands its card springs into its slot keeping its velocity; dropping one above another reorders the page. Risk: reorder vs stream; lock a section once final.
2. **Particle headline.** The brief's title as 3-5k particles; the cursor scatters, springs return. When the hero arrives, particles fly into the real glyphs and fade to live text. Risk: legibility; reduced motion = plain fade.
3. **Ink in the brand colours.** Fluid dye in the page palette; drag to swirl. As sections arrive it settles into the hero gradient, and the final gradient is what the user left. Risk: GPU heat; DPR clamp, pause, CSS fallback; keep desaturated (no-loud-chrome rule).
4. **Dot grid becomes the layout.** Canvas-2D dots lean toward the cursor; as each section lands, its dots align to the columns and dissolve into the row. Cheap, calm. Risk: too quiet.
5. **Magnetic photo cards.** Photo slots as dominant-colour cards that tilt toward the cursor; each sharpens from blur when generated. Low risk, small payoff.
6. **Play with the real page.** No toy: sections land live and the user already swaps a hero variant or edits a headline (Bayonetta, Lovable). Risk: edits overwritten; per-section locking.
7. **Scribble to accent.** Strokes on the empty hero become its underline or blob. Risk: the AI must honour it; ugly results.
8. **Flashlight wireframe** and **Snake-style egg**: rejected (sweeping light breaks the calm-motion rule; scores look unserious).

## Constraints

- **Performance** (21st.dev audit of 155 components; Stripe): a full-screen shader keeps the GPU out of low power; phones throttle after ~1 min, our window. Clamp `devicePixelRatio` to 1.5, pause via IntersectionObserver and hidden tab, start after first paint, 60 fps or a static frame. Prefer canvas-2D/Matter.js for ideas 1, 2, 4, 5.
- **Accessibility**: `prefers-reduced-motion` = one frame, then stop; WCAG 2.2.2 pause motion over 5 s, 2.3.3 motion-from-interaction switchable; keyboard users reach the same end state. The toy never delays the page or blocks editing.
- **Tone**: on the canvas, one blue, thin lines, no glow rings or AI cursors; gone the moment the page is final.

## Sources

blog.google; help.openai.com, aokmarketing.com (Snake); eweek.com (Pac-Man); eff.org (Namco); lvgl.io, blakesanie.substack.com (Watch); slashgear.com, bgr.com, nextpit.com; help.figma.com; blog.partykit.io; stripe.com/blog/globe; rauno.me; github.com/PavelDoGreat; framer.com marketplace; 21st.dev (components, animated-backgrounds blog); tympanus.net/codrops; joshwcomeau.com; lbbonline.com; docs.lovable.dev; davidmaister.com; ideas.repec.org (Buell & Norton; Cheng 2024); uxpsychology.substack.com, wiki.mi.uni-r.de (Hohenstein, Zhao, Pruyn & Smidts); nngroup.com/articles/animation-duration; WWDC18 803 via medium.com/@nathangitter.
