# Photos for AI-built landing pages, Oct 2026

Research for the editor's photo generation (OpenAI image models through `/api/photo`). Compiled 2026-10-24 by a research agent.

## Model status
- OpenAI deprecations: `gpt-image-1` shut down 2026-10-23; `gpt-image-1.5` and `gpt-image-1-mini` shut down 2026-12-01. Replacements: `gpt-image-2.5-sunburst` (quality) and `gpt-image-2.5-flare` (speed). The editor uses `gpt-image-2.5-flare` by default (`OPENAI_IMAGE_MODEL`).
- Imagen is gone from the Gemini API (Nano Banana instead). Midjourney default is V8.2.

## Prompting that works (OpenAI cookbook, BFL guide, NN/g)
- Order: scene/background → subject → key details → constraints. State the use ("website hero photo"). Short labelled segments.
- Say "real photograph" / "photorealistic" explicitly; lens, light and framing steer realism better than "8K", "flawless", "masterpiece" (polish words push toward CGI).
- Ask for texture and wear; "no heavy retouching or cinematic grading".
- No negative field: exclusions go in the prompt, short (3-7), scene-specific: "No extra text, no watermarks, no unrelated logos."
- Consistency across a set: one fixed "style contract" repeated verbatim (palette, light, camera, grade), plus a per-image line "Change only [scene/prop/crop]". References improve control but are not deterministic.
- Product: "do not restyle the product", keep label legible, contact shadow. UI: describe the interface "as if it already exists" (layout, hierarchy, device frame), no legible small text; or composite a real screenshot.
- Abstract nouns ("growth", "system") drift into diagrams; replace with one photographable subject.

Applied in `server/ai.ts` `photoPrompt`: Use → Scene → Subject → Details → Product line → Composition → Grade (style contract + "change only…") → Constraints (one frame, never a collage; no text, charts, diagrams, illustration, screens).

## Shot lists per business (pooled practitioner advice; no tested ratios)
- SaaS: Unbounce (200 pages): 40% of heroes show the product, 27% people, 8% illustration, 25% none. Tenet (21 sites): 57% product UI. Show the interface itself.
- Courses: instructor photo, course/UI mockup, real student results; avoid stock sections (Maven rubric).
- Coaches: niche headshot, session portrait, props and workspace, candid, detail/texture.
- E-commerce (Baymard): 42% try to gauge scale from images; in-scale and in-use shots matter; 56% start by exploring images.
- Local services: real staff and place, work in progress, before/after, the owner with the team; a slightly dusty uniform reads as real.
- Events: real speakers and attendees, few images.

Applied in the compose "shoot" rules: a per-business shot list, at most 2 people across a page, one frame per photo.

## What to avoid
- Generic people-at-laptop or smiling-headset stock scenes (NN/g: users ignore them; they scrutinise real staff photos).
- Text, hands, screens, glass reflections and background details are where AI images fail (NN/g checklist).
- Over-long ban lists; abstract-concept prompts; polish words.

## Generated vs stock
- NN/g (77 adults, hero images, 10 s): AI images were not at a disadvantage; only authenticity was significantly higher (+0.4/7). Viewers who suspected AI rated the page lower; disclosing AI use can reduce trust.
- A founder photo beat a stock headset photo by 35% (MarketingExperiments, 2011, small sample).
- Wix AI images "still looked fake" to a reviewer; Durable uses Unsplash/Shutterstock; Lovable images on request; `source.unsplash.com` URLs now 503.

## Sources
OpenAI cookbook image-gen prompting guides · OpenAI image prompting docs · OpenAI deprecations · BFL FLUX.2 prompting guide · Gemini Imagen docs · Midjourney Style/Omni reference docs · image3.org brand-style workflow · NN/g AI-generated images, photos as web content · MarketingExperiments stock images test · Unbounce state of SaaS landing pages · Tenet SaaS hero study · Baymard in-scale images · Spilt Media brand photos · Cube Creative website photos · Maven landing-page rubric · Expert Market Wix review · WebsitePlanet Durable review · Lovable blog · pexafy Unsplash migration · Squarespace Blueprint · promptaa keywords · Thryv (promotional).
