# Loading states for a 60-90 s AI page build (Oct 2026)

Our case: 40-90 s of streamed JSON, sections land one by one, then ~30 s of photos. Today: a static grey skeleton and "Writing your page".

## What the best do

**ChatGPT.** Images render top-to-bottom from a blurred preview (autoregressive model; community observation). The Snake claim is true: OpenAI's Sept 8 2026 release note for Images 2.5 says some users "see animated dots and a Snake game while images are generated"; not in Work mode; started by clicking the loading animation (X post, 23 Sept 2026). An easter egg, not the default. Thinking: a collapsible block streams step titles, then "Thought for N seconds".

**Claude.** Collapsible thinking summary. Artifact code streams into the side panel as written, then flips to preview (observed in product; no doc found).

**Lovable, Bolt, Replit.** Lovable docs: "see progress through visible tasks"; follow-ups allowed mid-build. Bolt lists file creation, installs and build steps live beside a preview. Replit: a Progress tab plus a checkpoint per finished task.

**Perplexity, Manus, Stitch, Gemini.** Perplexity: phase labels (Analyzing, Searching, Synthesizing; unverified wording) plus the sources being read. Manus: a "Manus's Computer" panel shows every action live and a to-do list that ticks off; cloud run, close the tab, get notified. Stitch: an estimate before generating ("90 seconds", accurate per a reviewer). Gemini video: "may take a few minutes", chat locked, open a new chat meanwhile.

**Gamma, Midjourney.** Gamma: outline first, then cards; under 60 s for 10-12 cards (card streaming unverified). Midjourney: "Waiting to start", then a percentage; the image is shown blurry and sharpens at each update.

**Durable, Wix, Hostinger, Squarespace, Framer, Relume, Canva, v0, Suno, Runway.** No source describes their wait screens; unverified. Relume and Framer split the job (sitemap, then wireframes), so a first result arrives early.

**Non-AI.** Duolingo: Duo plus language facts. Slack (c. 2014-2020): quips like "Caching internet locally..." (fan gist). Pinterest: frames filled with each photo's dominant colour. Linear: no spinners, data is local. Siri on iOS 18.1: coloured edge glow, non-blocking. Games: Namco's loading-minigame patent (Ridge Racer, Galaxian) expired 27 Nov 2015. Monzo, Tesla, Nintendo, Stripe, Spotify, Google Photos: nothing found.

## What research says

- Nielsen 1993: 0.1 s instant; 1 s keeps flow; 10 s is the attention limit. Past it, show percent-done and let users do other things.
- NN/g: looped animation only for 2-10 s; over 10 s use percent-done, a padded estimate and cancel. Never stall or reset; start slow, speed up at the end. A looped bar made users wait ~3x longer than no indicator.
- Maister 1985: unoccupied, pre-process, unexplained, uncertain and anxious waits all feel longer.
- Buell & Norton 2011, "labor illusion": 266 participants, 0-60 s. A changing list of airlines being searched beat a progress bar: perceived value +8%, and people preferred the slower site over instant identical results.
- Harrison 2010 (n=20): backwards ribbing and accelerating pulses made 5.61 s feel like 5 s (~11%).
- Skeletons: Luke W, Polar 2013; spinners "call attention to the fact that someone needs to wait". Viget 2017 (39-58 per cell): skeleton felt longest (2.82 s vs spinner 2.41 vs blank 2.29). Chung 2018 (small n): slow left-to-right shimmer beats pulse. HubSpot: the effect fades on long loads.
- NYU Tandon, CHI 2026 (n=240): identical answers delayed 2, 9 or 20 s; 9-20 s rated more thoughtful; usefulness peaked at 9 s; at 20 s some thought the internet dropped. Undisclosed delay called "performative deliberation".
- The Atlantic 2017: TurboTax's "checking" animation is fixed-length and talks to no server. Adar's rules: prefer honest options, must measurably help, users would approve if told. Wells Fargo example and "Chrome skeleton research": not found.

## What users hate

- Bars that stall near the end or reset; looped spinners past 10 s.
- Static placeholders that never change (our current state).
- No ETA, no explanation.
- Being locked out (Gemini locks the chat; Figma Make "thinking forever" threads), and finding out progress was fake (NYT needle backlash).

## Patterns ranked for a 60-90 s build

1. Stream the real page as it is written, section by section. Content is the indicator (ChatGPT, Claude, Bolt).
2. Narrated steps tied to real events ("Writing hero", "Choosing 6 photos", ticks). Labor illusion +8% (Manus, Replit).
3. Wireframe that fills in: real section slots as soon as the outline arrives. Static skeletons feel longer.
4. Honest padded ETA ("about 1 min"). Known waits feel shorter (Stitch).
5. Non-blocking: edit other pages, notify on finish. Nielsen's 10 s rule.
6. Photos: dominant-colour or blur placeholder that sharpens (Pinterest, Midjourney).
7. Calm slow left-to-right shimmer, no pulse. Chung 2018; fits our calm-motion rule.
8. Short product tips. Duolingo; low risk, often ignored.
9. Mini-game. Real at ChatGPT, but an easter egg; may look unserious to business users.
10. Humour copy. Slack; wears thin on repeat.
11. Ambient art, sound: no evidence; risky.
12. Fake progress or artificial delay: no. Backfires when noticed.

## Sources

help.openai.com, x.com, docs.lovable.dev, docs.replit.com, support.google.com/gemini, uxplanet.org, davidmaister.com, nngroup.com, uxtigers.com, ideas.repec.org, marketingweek.com, chrisharrison.net, gizmodo.com, viget.com, lukew.com, uxdesign.cc, hubspot.com, scienceblog.com (CHI 2026, doi 10.1145/3772318.3790716), The Atlantic 2017 (mirror voussoir.net), eff.org, gist.github.com, slashgear.com, performance.dev, codemyui.com.
