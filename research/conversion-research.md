# Conversion Research for the systeme.io AI Page Builder

Purpose: the source material for a "conversion skill" the AI page builder reads before it writes or restructures a page.
Audience of the pages: coaches, course creators, info-product sellers and small businesses selling to consumers and solo professionals.
Researched in October 2026. The URLs are in section 6.

**How to read the evidence tags**
- **[Strong]**: a large dataset or a controlled study (Unbounce 41k pages, Baymard, NN/g eyetracking, Portent, Google).
- **[Medium]**: a documented single A/B test, or an expert framework that is widely tested in practice.
- **[Weak]**: a vendor claim, an anecdote, or a secondary source we could not trace to a primary one. Use these numbers as direction only and never quote them to users as fact.

---

## 0. The ten rules that matter most

1. **One page, one goal, one action.** Every link that does not move the visitor toward the goal is a leak. Aim for an attention ratio of 1:1 [Medium, Unbounce/Oli Gardner].
2. **Clarity beats cleverness.** Within about 5 seconds, a visitor must know what this is, who it is for, and what to do next [Medium, MECLABS].
3. **Write at a 5th–7th grade reading level.** Pages at that level have an 11.1% median conversion rate. Pages at 8th–9th grade convert at 7.1%, and college-level pages at 5.3% [Strong, Unbounce 2024, 41k pages / 57M conversions].
4. **Design for mobile first.** 83% of landing-page visits are on mobile, yet mobile converts about 8% worse than desktop [Strong, Unbounce 2024].
5. **The top of the page gets most of the attention.** About 57% of viewing time is spent above the fold and 74% within the first two screens [Strong, NN/g eyetracking]. Put the promise, the proof hint and the CTA there.
6. **Load in under about 2.5 s.** Bounce probability rises 32% as load time goes from 1 s to 3 s [Strong, Google]. B2B lead-gen pages that load in 1 s convert 3x better than 5 s pages, and e-commerce pages 2.5x better [Strong, Portent 2022].
7. **Ask for the fewest fields you can.** Each extra field, especially textareas and dropdowns, costs conversions [Medium, HubSpot 40k pages]. Baymard finds checkouts can drop 20–60% of their default form elements [Strong].
8. **Put proof next to every claim and every CTA.** Use a real name, a face and a specific result. Anonymous or stock-photo proof can reduce trust [Medium].
9. **Reverse the risk.** A clear, specific guarantee next to the price usually lifts sales by much more than it raises refunds [Weak–Medium, anecdotal tests: +21% sales with 12% refunds; 3%→7% conversion with refunds rising only 4%→6.5%].
10. **Never fake urgency, scarcity or reviews.** These are illegal (FTC rule 16 CFR 465 from 2024, FTC dark-patterns report, CMA undertakings) and they destroy trust.

---

## 1. Universal conversion principles

### 1.1 One goal per page (attention ratio)
- Each page has exactly one conversion goal: opt in, register, buy, book or click to the next step.
- Remove the header navigation, footer link farms and social icons from funnel pages. Keep only the legal links (privacy, terms, contact) in a minimal footer.
- Every CTA on the page points to the **same** action. Repeating one CTA is good. Offering several different CTAs is bad.
- Oli Gardner found that about 98% of the landing pages he audited failed on message match or on having a single goal. One Unbounce webinar page went from a 6:1 to a 1:1 attention ratio and reported a lift of more than 40% [Weak, secondary].
- A typical homepage has an attention ratio around 57:1. That is why ad traffic should never go to a homepage.
- **Rule for the AI:** count every clickable element that does not trigger the goal action. If there are more than 2 (legal links do not count), flag it.

### 1.2 Message match (scent)
- The page headline must repeat the promise, and ideally the key words, of whatever sent the visitor there: the ad, the email subject or the social post.
- Visual match matters too. If the ad shows the lead magnet cover, the page should show the same cover.
- If the user tells the AI the traffic source (for example "Facebook ad about a 7-day yoga challenge"), the headline must contain "7-day" and "yoga".

### 1.3 Above the fold (first mobile screen ≈ 390×750 px)
The first screen must answer the 5-second test:
1. **What is it?** The headline states the outcome, not a feature or the brand name.
2. **Who is it for?** Name the audience explicitly or make it obvious.
3. **Why should I care?** A subheadline that adds the mechanism, the timeframe or how it removes pain.
4. **What do I do?** A visible primary CTA, or the form itself on an opt-in page.
5. **Why should I believe it?** A micro-proof line: "Joined by 12,400 students", "4.8/5 from 312 reviews", a recognisable logo strip, or a short quote.

Also on the first screen:
- A hero visual that shows the product or the result: an ebook mock-up, a course dashboard, the coach's face, or a before/after. Avoid generic stock imagery.
- No carousel or slider. Users ignore auto-rotating content, and it hides the message.

Evidence: about 57% of viewing time is above the fold and attention drops sharply after it, a pattern unchanged from 2010 to 2018 [Strong, NN/g]. The F-pattern means the first lines and the first 2–3 words at the left of each line get the most fixations [Strong, NN/g, 232 users].

### 1.4 CTA count and placement
- **Short pages** (opt-in, registration): 1 CTA in the hero, plus at most 1 repeat after the proof section.
- **Long pages** (sales letter): place the CTA after the hero, after the offer/value stack, after the guarantee and at the very end. Add one more after any section that answers a big objection. Roughly one CTA for every 1.5–2 mobile screens after the offer is first shown.
- Do not put a "Buy" CTA before the visitor knows what they are buying and what it costs. On sales pages the first CTA can be "See what's inside" (an anchor link) until the offer has been presented.
- Make the CTA the highest-contrast element on the page. Use one button colour and do not use that colour for anything else.
- Put micro-copy (anxiety reducers) directly under the button: "No credit card required", "Instant access", "Unsubscribe anytime", "30-day money-back guarantee", "Secure checkout".

### 1.5 Proof near claims and CTAs
- Every big claim ("lose 5 kg in 30 days", "get your first client") needs proof within the same section or the next one.
- Put 1 testimonial or stat directly above or below each CTA after the first.
- Proof quality ladder, from strongest to weakest:
  1. A specific result with a name, a photo and context ("Sarah K., 41, nurse — first paid client in 19 days")
  2. A video testimonial
  3. Screenshots of results, such as a message or a dashboard, with permission
  4. Numbers ("12,400 students in 37 countries")
  5. Logos and press mentions ("As seen in")
  6. Anonymous quotes. Avoid these.
- Spiegel/PowerReviews: purchase likelihood rises steeply with the first 5 reviews (reported +270%), and peaks at a 4.2–4.5 average rating. A perfect 5.0 looks fake [Weak–Medium, vendor-funded, correlational]. Takeaway: a mix of mostly 5-star and some 4-star reviews is more believable than all 5-star reviews.
- 37signals (Highrise): a big photo of a smiling customer next to their quote increased paid signups (+47% vs the long-form page). Which person was shown didn't matter much [Medium].
- NN/g: every participant read external reviews before hiring. Users trust third-party reviews more than on-site testimonials. Linking to Trustpilot or Google reviews signals confidence [Strong, qualitative].

### 1.6 Handle objections explicitly
- List the top 5–7 objections for the offer type and answer each one somewhere on the page: in the body, the FAQ, the guarantee or the CTA micro-copy.
- The universal objections are:
  - **Price:** "Is it worth it?"
  - **Time:** "I don't have time"
  - **Self-doubt:** "Will it work for me?"
  - **Trust:** "Is this legit?"
  - **Past failure:** "I've tried things before"
  - **Specifics:** "What exactly do I get?"
  - **Logistics:** "How do I access it, and for how long?"

### 1.7 Specificity beats generality
- "Lose 4.5 kg in 6 weeks with 20-minute home workouts" beats "Get fit fast".
- Odd, precise numbers read as measured: 37 recipes, 4.7 rating, 2,341 students.
- Use concrete nouns and timeframes instead of adjectives. "Amazing", "revolutionary" and "ultimate" carry zero information.

### 1.8 Readability and scannability
- Target a 5th–7th grade level, measured by Flesch-Kincaid grade ≤ 7 or Flesch reading ease ≥ 70 [Strong, Unbounce].
- Unbounce associates heavy use of words with three or more syllables with a 24.3% drop in conversion [Strong].
- Paragraphs: 1–3 sentences. Sentences: 20 words or fewer on average.
- Section headings must carry meaning on their own. Visitors scan the headings in an F/layer-cake pattern, so put the key words first.
- Bullets for lists of benefits or inclusions, with 3–7 bullets per list.
- Body text ≥ 16px on mobile (18px preferred), line length 50–75 characters, contrast ≥ 4.5:1.

### 1.9 Trust and disclosure (NN/g's four trust factors)
1. **Design quality.** Clean, consistent and free of typos. NN/g participants penalised a site for a single spelling error.
2. **Up-front disclosure.**
   - Show the price, the fees, the billing frequency and the refund policy before asking for payment details.
   - Show contact information.
   - One NN/g user abandoned a site after 35 seconds because it hid prices.
3. **Comprehensive, current content.** Show the real person and the real deliverables. Use the current year in dates, and never let a "2023" bonus appear in 2026.
4. **Connection to the wider web.** Link to external reviews, social profiles and press.

### 1.10 Mobile
- Design every section mobile first: one column, the CTA full-width or at least 48px tall, and tap targets ≥ 44×44 px with spacing. WCAG 2.2 sets 24×24 px as the AA minimum.
- Forms: set the correct `type` and `autocomplete` on every field, use labels above the fields, and never use placeholder-only labels [Strong, Baymard].
- On long mobile pages, consider a sticky bottom CTA bar on sales pages, shown only after the offer has been introduced.

### 1.11 Speed
- Google's thresholds: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Business impact:
  - Bounce probability +32% from 1 s → 3 s [Strong, Google].
  - Conversion rate 3x higher at 1 s vs 5 s for lead gen [Strong, Portent].
  - A 0.1 s mobile speed gain was associated with +8.4% retail and +10.1% travel conversions [Medium, Google/Deloitte, 37 brands].
- **AI rules:**
  - Compress hero images to ≤ 200 KB, use WebP or AVIF, and set explicit dimensions to avoid CLS.
  - Lazy-load everything below the fold.
  - Allow at most one video, loaded as a click-to-play facade.
  - No autoplaying background video on mobile.

### 1.12 Accessibility as a conversion factor
- 69% of disabled online shoppers click away from sites that are hard to use, worth £17.1bn a year in the UK alone. Only 8% contact the owner [Medium, Click-Away Pound 2019].
- Low-contrast text is the most common detected failure, on about 79% of the top 1M homepages [Strong, WebAIM Million 2025].
- **Rules:**
  - Text contrast ≥ 4.5:1, or 3:1 for large text.
  - The button label must contrast with the button background.
  - Every input has a visible label.
  - Error messages are written in text, not only shown in red.
  - Images have alt text.
  - Headings follow a logical order (one H1).
  - The page is keyboard-operable, and countdowns can be ignored without penalty.

### 1.13 Forms
- Lead forms:
  - Email only, or first name + email. Asking for the first name lets later emails be personalised. Ask for a phone number only if a human will actually call.
  - Required fields cost leads. In one test a required phone field converted 43% worse than an optional one [Weak–Medium, single case].
- Textareas and dropdowns hurt conversion more than single-line fields [Medium, HubSpot 40k pages].
- Long qualifying forms (applications) work better as **multi-step forms** with progress shown. One case: multi-step +52.9% vs control, single-step +40.3% [Weak–Medium].
- **Inline validation:**
  - Validate when the user leaves a field, not while they are typing.
  - Remove the error the moment it is fixed.
  - Show positive checkmarks.
  - Baymard found 31% of sites have no inline validation [Strong].
- Explain why sensitive fields are needed. Example: "Phone — only used for your call reminder".

### 1.14 Offer and value framing (Hormozi value equation)
`Value = (Dream Outcome × Perceived Likelihood of Achievement) ÷ (Time Delay × Effort & Sacrifice)`

The AI should make sure the page contains at least one element for each of the four levers:

| Lever | Page element |
|---|---|
| **Dream outcome ↑** | The headline names the end state the buyer wants (status, money, body, relationship, time), not the product. |
| **Likelihood ↑** | Proof, testimonials from people similar to the buyer, the creator's credentials, a guarantee, and the "mechanism" (why this works when other things failed). |
| **Time delay ↓** | "First result in 7 days", "Quick-start module (20 min)", fast-win bonuses. |
| **Effort ↓** | "Done-for-you templates", "15 min/day", "No equipment", "Copy-paste scripts". |

Other offer levers:
- **Bonuses instead of discounts.** Each bonus answers a specific objection and has its own stated value.
- **Naming.** Use Hormozi's MAGIC formula: Magnetic reason, Avatar, Goal, Interval, Container. Example: "The 30-Day Busy Mom Yoga Reset".
- **Scarcity and urgency** only when they are real (see section 5).

### 1.15 Awareness levels (Eugene Schwartz) decide the page's opening
Map the traffic temperature to the opening of the page:

| Awareness | Who | Lead with | Page length |
|---|---|---|---|
| Unaware | Cold social traffic, doesn't feel the problem | Story, a surprising fact, an identity hook | Long |
| Problem aware | Feels the pain, doesn't know solutions | The problem, in their own words (PAS) | Long |
| Solution aware | Knows solutions exist, not yours | Your unique mechanism and why it beats the alternatives | Medium–long |
| Product aware | Knows you, undecided | Proof, the offer details, bonuses, the guarantee | Medium |
| Most aware | Ready, waiting for the deal | The offer and price right away, deadline if real, CTA | Short |

Default for systeme.io users when unknown: **problem aware** for opt-ins and webinars, **solution/product aware** for sales pages reached from email (the list is already warm).

### 1.16 Page length
- Length follows **price × unfamiliarity**. Low commitment (free lead magnet) means short. High price or an unknown mechanism means long.
- Moz/Conversion Rate Experts: a research-based page about 6x longer earned +52% sales on a paid product, roughly $1M a year [Medium]. The length came from answering real objections found in customer interviews, not from padding.
- VWO/Designboost: a shorter page won for email signups [Medium].
- **Rule:** every section must do one job: promise, proof, objection, offer, risk reversal or CTA. If a section does none of these, cut it.

---

## 2. Page-type playbooks

Notation: **Section — job**. The "must-haves" are what the scoring rubric checks.

### 2.1 Opt-in / lead magnet (squeeze) page
**Goal:** get the email address. Typical benchmarks: 20–40% for warm traffic, 5–15% for cold paid traffic [Weak, aggregated]. Unbounce's cross-industry landing-page median is 6.6%.

**Ideal section order**

*Short version, recommended as the default:*
1. **Hero — promise + form.**
   - Headline (specific outcome + lead magnet format).
   - Subheadline (who it's for + time to value).
   - A mock-up image of the lead magnet.
   - The form (email, or first name + email).
   - Button and privacy micro-copy.
2. **"Inside you'll discover" — 3–5 fascination bullets.** Makes the freebie feel valuable and specific.
3. **Micro-proof.** One testimonial or a subscriber count ("Join 8,214 coaches").
4. **About the author — 2–3 lines + photo.** Builds credibility, makes it human.
5. **Repeat CTA** (scrolls to the form or opens a 2-step popup).
6. **Minimal footer** (privacy, terms).

**Must-haves**
- No navigation.
- The form is in the first screen on mobile.
- The lead magnet is shown visually.
- The button says what they get.
- Privacy reassurance.
- Only 1–2 fields.

**Common mistakes**
- Vague freebies ("Free guide", "Newsletter").
- Long bios before the offer.
- Asking for a phone number.
- "Submit" as the button text.
- Linking to the main site or social profiles.
- Lead magnets that solve nothing quickly. A one-page checklist beats a 60-page ebook.

**Length:** 1–3 mobile screens and 150–400 words.

**Patterns**
- Headline: "Free [Format]: [Specific Outcome] in [Timeframe] (Without [Pain])".
  - "Free 7-Day Plan: Fall Asleep in 15 Minutes Without Pills"
- Alternative headline: "The [Number]-[Item] [Format] [Avatar] Use to [Outcome]".
  - "The 12-Question Script Coaches Use to Close Discovery Calls"
- CTAs: "Send Me the Free Plan", "Get My Checklist", "Yes, Show Me the Script".
- Micro-copy: "Instant access. No spam — unsubscribe in one click."
- Two-step opt-in: a button opens a popup form. Brunson-style funnels use this because the first click is a small commitment. It is a valid test variant [Weak–Medium].

### 2.2 Sales page — low ticket ($7–$97: ebooks, mini-courses, templates, challenges)
**Goal:** an impulse-level purchase. Typical cold-traffic purchase rates are 1–5% [Weak]. Warm email traffic converts much higher.

**Ideal section order**
1. **Hero — outcome headline + product visual + price-anchored CTA.**
   - "Get the Kit — $27" is acceptable when the audience is most aware or product aware.
2. **Problem agitation (short, 3–5 lines).** Mirrors the reader's frustration in customer language.
3. **The solution and what makes it different (mechanism).** Why this works when generic advice didn't.
4. **What's inside — module or chapter list with benefit bullets.** Makes the product tangible.
5. **Proof — 3–6 testimonials.** Raises likelihood.
6. **Value stack + price.**
   - List each component with its value, then the total, then the price.
   - Example: "Total value $214 — today $27".
   - Use anchoring, but only with honest values (section 5).
7. **Order bump hint / bonuses.** Increases perceived value.
8. **Guarantee — badge + specific wording.** Removes risk.
9. **Who it's for / not for.** Self-qualification and trust.
10. **FAQ — 5–8 questions.** Answers objections.
11. **Final CTA + recap of the offer.** For people who scrolled to the bottom.

**Must-haves**
- Price visible on the page.
- Product visual.
- At least 3 testimonials.
- Guarantee next to the price.
- At least 3 CTAs.
- FAQ.
- Instant-access statement.

**Common mistakes**
- Hiding the price until checkout.
- A wall of text with no visuals.
- Fake "was $497" anchors.
- No answer to "how do I get it after paying".

**Length:** 4–8 mobile screens and 800–1,800 words.

**Patterns**
- Headline: "[Outcome] in [Timeframe] — Even If [Objection]".
  - "Plan a Week of Healthy Dinners in 30 Minutes — Even If You Hate Cooking"
- CTAs: "Get Instant Access — $27", "Yes, I Want the Kit", "Start the Challenge for $17".

### 2.3 Sales page — high ticket ($500–$5,000+: signature courses, programs, memberships)
**Goal:** a purchase, or a qualified click to checkout or to a payment-plan choice.

**Ideal section order** (long-form sales letter, PAS → offer → proof → close)
1. **Hero.**
   - A big-promise headline, a subhead with the mechanism and the audience, and an optional VSL (2–15 min).
   - The CTA here is "Join Now" or "See Plans" (an anchor link).
2. **Problem + agitation.** The reader's situation, the costs of staying stuck, failed past attempts.
3. **Story / origin (the "Epiphany Bridge").** The creator's struggle → discovery → result. Builds connection and authority.
4. **The mechanism / new opportunity.** Why the old ways fail and this way works. Answers "I've tried everything".
5. **Results proof wall.** 6–12 testimonials with specifics, ideally video and case studies.
6. **The program — modules as outcomes, week by week.** Makes it tangible and lowers perceived effort.
7. **Bonuses — each tied to an objection.** Example: "Bonus: Done-for-you templates (removes 'I don't have time')".
8. **Value stack + price + payment plan.** Anchoring, and affordability ("or 3 × $333").
9. **Guarantee.** A conditional or unconditional risk reversal.
10. **Who this is for / not for.** Qualification, and less buyer's remorse.
11. **About the creator.** Credentials, photo, mission.
12. **FAQ — 8–12 questions.** Objection sweep.
13. **Final close.**
    - Two futures: "Six months from now…".
    - A real deadline or cap, if one exists.
    - The CTA.
14. **P.S. (optional).** Restates the offer, guarantee and CTA. Skimmers read it.

**Must-haves**
- Mechanism section.
- At least 6 testimonials with specific results.
- Payment plan option.
- Guarantee or clear refund terms.
- Creator photo + credentials.
- FAQ.
- CTA after every major block from the offer onward.

**Common mistakes**
- Leading with the creator's bio.
- Features ("12 modules, 48 videos") without outcomes.
- No payment plan.
- Unbelievable income claims (also a legal risk).
- A deadline that resets.

**Length:** 10–25 mobile screens and 2,500–6,000 words. Long is fine when every section earns its place.

**Patterns**
- Headline: "How [Avatar] Are [Achieving Outcome] in [Timeframe] Without [Pain/Sacrifice]".
- Alternative: "The [Named Method] That Helped [N] [Avatar] [Specific Result]".
- CTAs: "Join [Program Name]", "Enroll Now — Start Monday", "Choose My Plan".

### 2.4 Webinar / masterclass registration page
**Goal:** registration, then attendance. Typical registration rates are 20–45% for warm traffic [Weak]. Registrant-to-attendee rates are about 33–57% live [Medium, ON24 data across years].

**Ideal section order**
1. **Hero.**
   - Event label ("Free Live Masterclass").
   - Headline (the big outcome learned).
   - Date, time and timezone, or "watch now / next session in X min" for evergreen events.
   - Host photo.
   - Register CTA (opens a 2-step form or an inline form).
2. **"In this free training you'll learn" — 3 "secrets" or lessons.**
   - Each one breaks a false belief (Brunson's "3 secrets" structure).
   - Builds curiosity without giving away the how.
3. **Who it's for.** Qualifies the visitor and lets them see themselves in it.
4. **Host bio — photo + 3 credibility facts.** Authority.
5. **Proof.** Attendee or student testimonials, or the attendee count from past sessions.
6. **Repeat CTA + date.**
7. **Optional: an attendance bonus.** "Stay till the end for a free [workbook]". Raises show-up.

**Must-haves**
- Date, time and timezone in the hero.
- Host face.
- 3 learning bullets.
- A 1–2 field form.
- Calendar reassurance ("You'll get a reminder").

**Common mistakes**
- The timezone is missing.
- Bullets that read like a sales pitch.
- Calling it a "webinar" when "free training" or "masterclass" converts more naturally with coaching audiences. Test this.
- A fake "seats are filling up" counter.

**Length:** 2–4 mobile screens and 300–700 words.

**Patterns**
- Headline: "Free Masterclass: How to [Outcome] Without [Pain] — [Date]".
- Alternative: "The 3 [Things] Every [Avatar] Needs to [Outcome]".
- CTAs: "Save My Free Seat", "Register for the Training", "Reserve My Spot".

### 2.5 Thank-you / confirmation page
**Goal:** confirm the action, then take the next micro-step: consume the lead magnet, add the event to the calendar, whitelist the email, join a community, or buy a tripwire.

**Ideal section order**
1. **Confirmation headline.** "You're in! Check your inbox for [X]". Removes doubt.
2. **The next 1–3 steps, numbered.**
   - "1. Open the email from [Name] (subject: '…')"
   - "2. Add to calendar"
   - "3. Join the Facebook group"
3. **One secondary offer OR one next action.** Uses the momentum. A tripwire ($7–$27) related to the freebie, or a short welcome video.
4. **Optional: a welcome video (≤ 2 min)** from the creator. Builds relationship and raises email opens and show-up.

**Must-haves**
- A clear confirmation.
- Where to find the deliverable.
- **One** next action (not 3–4).
- For webinars: add-to-calendar buttons (Google, Apple, Outlook) and a reminder to attend.

**Common mistakes**
- A dead-end "Thanks!" page.
- A hard sell that doesn't relate to what they signed up for.
- Several competing CTAs.
- Not setting the page to noindex, which skews tracking.

**Length:** 1–2 mobile screens. With a tripwire offer, up to 4.

**Patterns**
- "You're In! Here's What Happens Next"
- "One Last Step: Confirm Your Email"
- Tripwire: "Before you go — get the [Toolkit] for $9 (one-time offer)"

### 2.6 Checkout / order form page
**Goal:** a completed payment. Average documented cart abandonment is about 70% [Strong, Baymard]. Better checkout design can lift conversion by about 35% for large sites [Strong, Baymard].

**Baymard abandonment reasons (US, excluding "just browsing")**

| Reason | Share |
|---|---|
| Extra costs too high | 40% |
| Delivery too slow (physical goods) | 20% |
| Didn't trust the site with card details | 19% |
| Account creation required | 18% |
| Too long or complicated | 17% |
| Errors | 17% |
| Returns policy | 13% |
| Couldn't see the total up front | 12% |
| Card declined | 10% |
| Not enough payment methods | 9% |

**Ideal structure** (one page for digital products, two columns on desktop and stacked on mobile)
1. **Product summary.**
   - Name, image, what's included in 3 bullets, and the price with the billing frequency and taxes stated.
   - Keeps the value in front of them and removes cost surprise.
2. **The form.**
   - Email → name → payment.
   - No account creation. The account is created automatically after purchase.
   - Address only for physical goods or where tax requires it.
   - Minimises fields.
3. **Payment methods.** Card plus at least one wallet (PayPal, Apple/Google Pay) where available. 9% leave for lack of options.
4. **Order bump.**
   - A checkbox box under the payment fields, with a short headline, a 1–2 sentence benefit, and the price.
   - Typical take rates are 15–40% [Weak, vendor data].
5. **Trust cluster at the payment fields.**
   - Padlock, "Secure checkout", guarantee badge, a payment logos row.
   - A visually distinct card-field area increases perceived security.
   - Addresses the 19% trust gap [Strong, Baymard].
6. **Mini testimonial (1).** Reassurance at the point of anxiety.
7. **Submit button with the amount.** "Complete Purchase — $47". No surprise.
8. **Fine print.** Refund policy link, terms, and for subscriptions the recurring terms in plain words.

**Must-haves**
- Total price visible before the card fields.
- Guest-style checkout (no password field).
- At most 7 fields for digital products.
- Inline validation.
- Trust cluster.
- Guarantee reminder.
- No navigation away.
- Autofill attributes.

**Common mistakes**
- Surprise fees.
- A "Create password" field.
- Coupon fields that send people hunting for codes. If needed, collapse them behind a "Have a code?" link.
- Header links.
- Unclear subscription terms. This is also a legal risk under the FTC "click-to-cancel" and negative-option rules.

**Patterns**
- Headline: "You're One Step Away From [Outcome]" or "Complete Your Order".
- Order bump: "YES! Add the [Swipe File] for just $17 (one-time price — only on this page)". Use "only on this page" only if it is true.
- Button: "Complete My Order", "Get Instant Access — $47".

### 2.7 Upsell / one-time offer (OTO) / downsell
**Goal:** a one-click accept after the first purchase. Typical OTO take rates are about 10–25% [Weak, vendor data].

**Ideal section order**
1. **Progress bar / status line.**
   - "Order complete ✓ — Step 2 of 3: customise your order. Do not close this page."
   - Reassures that the first purchase succeeded and prevents fear of a double charge.
2. **Congratulatory headline that bridges.** "Wait! Your order is confirmed. Want to get [result] 2x faster?" Connects the new offer to the purchase just made.
3. **Short video or 3–5 paragraphs.** Why the upsell is the logical next step (done-for-you, faster, more complete).
4. **What you get + value.** 3–5 bullets.
5. **One-click buy button** with the price. Example: "Yes, Add This to My Order — $97".
6. **Guarantee line.**
7. **Decline link** (plain text, honest).
   - "No thanks, I'll continue without the templates."
   - Never use a manipulative confirmshame line like "No, I hate making money".
8. **Downsell (if declined).** A smaller version or a payment plan.

**Must-haves**
- The first purchase is confirmed.
- The offer is relevant to the first product.
- One-click accept (no card re-entry).
- A clear decline link.
- The price is stated on the button.

**Common mistakes**
- An unrelated offer.
- No decline option or a hidden one.
- Shaming decline copy.
- A pitch longer than the original sales page.
- Saying "you'll never see this again" when the same price is in the store.

**Length:** 2–6 mobile screens.

### 2.8 Coaching application / book-a-call page
**Goal:** a qualified, booked call that actually happens. Typical funnel: VSL/sales page → application → calendar (only for qualified applicants) → confirmation page that reduces no-shows. Application-to-booked-call targets are about 50–70% [Weak].

**Ideal section order**
1. **Hero.**
   - Outcome headline + who it's for ("For established coaches doing $3k–10k/mo").
   - CTA "Apply for a Free Strategy Call".
   - Optional VSL.
2. **Problem / the gap.** Where they are vs where they want to be.
3. **How the program or coaching works (3-step plan).** StoryBrand "plan": lowers confusion and perceived effort.
4. **Case studies — 3–5 detailed stories** (before → what we did → after, with numbers). The strongest likelihood lever for high-ticket offers.
5. **About the coach.** Credentials and a human photo.
6. **What happens on the call.**
   - "30 min, Zoom, we map your next 90 days. No pressure — if it's not a fit, I'll tell you."
   - Lowers fear of a sales ambush.
7. **Who this is NOT for.** Filters out poor fits and adds exclusivity.
8. **Application form (multi-step).**
   - 5–8 questions: current situation, goal, timeline/urgency, what they've tried, budget readiness ("Are you able to invest $X if it's a fit?").
   - Name, email and phone at the end.
9. **FAQ.** Includes "How much does it cost?" Being transparent about the price range builds trust and pre-qualifies.

**Confirmation page**
- Confirm the booking.
- Add-to-calendar.
- A pre-call video or homework.
- "Reply to the email to confirm".
- Testimonials. This reduces no-shows.

**Must-haves**
- Qualification criteria are visible.
- Call format, length and no-pressure promise.
- Case studies with numbers.
- A multi-step form with a progress indicator.
- A calendar only after the application (or inline after the questions).

**Common mistakes**
- "Book a call" with no context.
- Hiding all pricing information. A range is OK.
- 15+ questions on one screen.
- No confirmation or reminder flow.

**Patterns**
- Headline: "Get [Outcome] in [90 Days] With 1:1 Coaching — Or Keep Working Until You Do".
- CTAs: "Apply for a Strategy Call", "See If I Qualify", "Book My Free Session".

---

## 3. Copywriting toolkit

### 3.1 Headline formulas (with fill-ins)
Test every headline with the **4 U's**: Useful, Urgent, Unique, Ultra-specific. Score each from 1–4 and aim for 12 or more out of 16 [Medium, AWAI/Masterson].

| # | Formula | Yoga course | Business coach | Finance ebook |
|---|---|---|---|---|
| 1 | [Outcome] in [Time] Without [Pain] | Touch Your Toes in 30 Days Without Painful Stretching | Sign 3 New Clients in 30 Days Without Cold DMs | Pay Off $10,000 of Debt in 12 Months Without a Second Job |
| 2 | How [Avatar] [Outcome] — Even If [Objection] | How Desk Workers Fix Back Pain in 15 Min a Day — Even If They've Never Done Yoga | How New Coaches Fill Their Calendar — Even With 300 Followers | How Freelancers Build a 6-Month Safety Net — Even on Irregular Income |
| 3 | The [N]-[Unit] [Method] That [Result] | The 12-Minute Morning Flow That Ends Stiff Mornings | The 5-Message Sequence That Books Discovery Calls | The 4-Account System That Makes Budgeting Automatic |
| 4 | Finally, [Desired State] for [Avatar] | Finally, Yoga That Fits a Busy Mom's Schedule | Finally, a Client-Getting System for Introverted Coaches | Finally, a Money Plan for People Who Hate Spreadsheets |
| 5 | Stop [Pain]. Start [Gain]. | Stop Waking Up Stiff. Start Moving Like You're 25. | Stop Chasing Leads. Start Choosing Clients. | Stop Living Paycheck to Paycheck. Start Saving $500/Month. |
| 6 | Customer-quote headline (voice of customer) | "I Finally Sleep Through the Night" — 21-Day Bedtime Yoga | "I Doubled My Prices and Clients Said Yes" | "I Paid Off My Car 14 Months Early" |
| 7 | Question that qualifies | Is Tight-Hip Pain Keeping You From Running? | Still Stuck at $3k Months After a Year of Coaching? | Do You Earn Well but Still Feel Broke? |
| 8 | Free [Format]: [Outcome] (opt-in) | Free 7-Day Flexibility Plan for Beginners | Free Script: The 3 Questions That Close Sales Calls | Free Workbook: Find $300 Hidden in Your Budget This Week |

**Headline rules**
- 6–12 words is the sweet spot. Up to about 18 is OK if it is specific.
- Put the outcome in the first 3 words where possible (F-pattern).
- Prefer numerals ("7", not "seven").
- No clever puns that need decoding.
- Use the customer's words over the creator's jargon. Wiebe's "message mining" method takes phrasing from reviews, surveys and comments. Example: a rehab headline taken verbatim from a book review, "If you think you need rehab, you do."

### 3.2 Subheadline rules
- **Job:** add what the headline left out, usually the *who*, the *how* (mechanism) and the *how fast/easy*.
- 1–2 sentences, 15–30 words.
- Never repeat the headline in other words.
- Formula: "[Program/thing] helps [avatar] [outcome] using [mechanism] — in just [time/effort]."
  - Yoga: "A 21-day video program for beginners over 40: 15-minute daily flows that rebuild flexibility without strain."

### 3.3 Bullet / fascination formulas
A bullet is **benefit + curiosity**. It names the payoff and holds back part of the how. Use 3–7 per list. Each starts with a strong word and stays under 20 words.

| Formula | Example |
|---|---|
| How to [result] without [pain] | How to get your first client without posting daily on Instagram |
| The [adj] reason [common belief] is wrong (page X) | The surprising reason stretching every day makes tight hips worse |
| [N] [things] that [result] — #3 takes 2 minutes | 5 budget leaks that drain $200/month — #3 takes 2 minutes to fix |
| Why [counterintuitive claim] | Why raising your price can make clients say yes faster |
| What never to [do] when [situation] | What never to say when a prospect asks "how much?" |
| The [timeframe] [action] that [result] | The 60-second breathing trick that calms you before sleep |
| Exactly what to [do] when [moment] | Exactly what to do the day you receive a tax refund |
| Feature → "so you can" → benefit | 30 done-for-you templates, so you can launch this weekend instead of next month |

Rule: never promise a result that the product doesn't deliver. Curiosity is fine. Deception is not.

### 3.4 CTA copy rules
1. **Name what they get, not what they do.** "Get My Free Plan" beats "Submit". "Sign up" and "Submit" are banned.
2. **Write in the first person.** Changing "your" to "my" in "Start my free 30-day trial" gave +90% clicks in a ContentVerve/Unbounce test [Medium, single test, which varied in follow-ups]. Default to the first person and treat it as a test variable.
3. **Avoid commitment-heavy verbs on low-commitment actions.**
   - "Request a free copy" beat "Sign in and order a sample" by +132% clicks [Medium, MECLABS].
   - "Order", "buy" and "pay" belong on the checkout only.
4. **Length:** 2–5 words, starting with a verb. Adding the price on purchase buttons removes surprise.
5. **Put micro-copy under every primary CTA** (one line, 12–14px): "Instant access · 30-day guarantee · Secure payment".
6. **Use the same wording for the same action** throughout the page.
7. **Optional "Yes"-style CTAs** work for OTOs and bumps: "Yes! Add the Templates".

### 3.5 Testimonial selection and format
- **Select testimonials that:**
  - Show a specific result with a number or timeframe.
  - Come from someone who matches the target avatar.
  - Pre-empt a key objection ("I was skeptical because…", "I only had 20 minutes a day…").
- **Format:**
  - Photo (a real face, ≥ 64px).
  - Full name or first name + last initial.
  - Role or location ("Mum of 2, Leeds" / "Business coach, 2 yrs").
  - A bolded result line as the headline of the quote, followed by a 1–3 sentence quote.
- **Structure inside the quote:** before → after → specific result → feeling.
- **Variety:** mix demographics, and use one or two 4-star or nuanced reviews so the set looks credible.
- **Placement:** next to the claim they support, and one adjacent to each CTA. Use a dedicated "Results" section on sales pages.
- **Never:** invent, edit to change meaning, use stock photos, or show results that are not typical without context. Disclose any incentives the reviewer received.

### 3.6 Guarantee wording
- **Name it, time-box it and make the process clear.** Example: "**The 30-Day 'Love It or Your Money Back' Guarantee.** Go through the first two modules. If you don't feel more confident on camera, email support@… within 30 days and we'll refund every cent. No forms, no hoops."
- **Guarantee types (Hormozi):**
  - **Unconditional:** a refund for any reason within N days. Best for low ticket.
  - **Conditional:** "Do the work and if you don't get X, we refund", or "we work with you free until you do". Best for high ticket because it filters buyers and raises completion.
  - **Anti-guarantee:** "All sales final because [honest reason]", for example instant access to everything. Use rarely and state it clearly.
  - **Implied:** performance-based pricing.
- **Placement:** a badge plus a short line next to the price, a full section after the offer, and a repeat at the checkout.
- **Longer windows** (60–365 days) often reduce refunds because people stop watching the clock [Weak, practitioner reports]. Only offer what the creator will honour.

### 3.7 FAQ as objection handling
- 5–12 questions, phrased as the buyer would ask them.
- Lead each answer with "Yes" or "No" plus one sentence, then the detail.
- Order by objection weight: price/value → "will it work for me" → time → access/logistics → refund → support.
- **Must-include questions:**
  - "How long do I have access?"
  - "What if I'm a complete beginner?"
  - "How much time does it take per week?"
  - "What if it doesn't work for me?" (links to the guarantee)
  - "Is there a payment plan?"
  - "When does it start, and how do I access it?"
- Put a CTA directly after the FAQ.

### 3.8 Copy frameworks (when to use which)

| Framework | Structure | Use for |
|---|---|---|
| **PAS** | Problem → Agitate → Solution | Problem-aware traffic, opt-ins and sales intros |
| **AIDA** | Attention → Interest → Desire → Action | Overall page flow for any page |
| **BAB** | Before → After → Bridge | Testimonials, short sections, emails, upsells |
| **StoryBrand SB7** | Character (customer) has a problem → meets a guide (creator: empathy + authority) → who gives a plan → calls to action → avoid failure / achieve success | Coaching and service pages. The customer is the hero, never the brand. |
| **4 U's** | Useful, Urgent, Unique, Ultra-specific | A headline quality check |
| **Epiphany Bridge (Brunson)** | Backstory → desire → wall → epiphany → plan → conflict → achievement | The story section of sales or webinar pages |
| **Value equation (Hormozi)** | Dream outcome, likelihood, time, effort | Offer and value-stack sections |

### 3.9 Awareness-level adaptation (what to change in the hero)

| Level | Hero headline example (business coach) |
|---|---|
| Unaware | "Why 80% of New Coaches Quit in Year One (It's Not Their Skills)" |
| Problem aware | "Tired of Posting Every Day and Still Getting No Clients?" |
| Solution aware | "The Referral-First Method: Get Clients Without Social Media" |
| Product aware | "Join 1,200 Coaches Inside Client Engine — See Their Results" |
| Most aware | "Client Engine Doors Close Friday: Join for $497 or 3 × $177" |

### 3.10 Voice rules
- **Write to one person.** Use "you" and "your" (but "my" on buttons). Use the creator's "I" for solo creators and "we" for teams.
- **Specific numbers beat adjectives.** Never write "many students". Write "2,341 students".
- **Customer language beats creator jargon.** Write "fall asleep fast", not "optimise sleep architecture".
- **Banned hype words** (unless they are inside a real quote):
  - revolutionary, game-changing, ultimate, unlock, unleash, skyrocket, supercharge, cutting-edge, world-class, seamless, synergy
  - "secret" (more than once on a page)
  - "guaranteed results" (unless it is a real guarantee)
  - !!!, ALL CAPS sentences
- **Short words, short sentences.** Contractions are fine. No stacked adjectives.
- **Use benefits with features.** Every feature gets "so you can…".
- **Sound credible.** No income or health claims without typical-results context. FTC rules require typical results to be disclosed when testimonials show atypical ones.
- **Match the formality to the audience.** A yoga page is warm and calm. A finance page is precise and reassuring. A business coach page is direct and confident.

---

## 4. Conversion scoring rubric (100 points)

How to use it:
- Run every check against the page tree (sections → elements).
- Each check returns pass (full weight), partial (half weight) or fail (0).
- Checks that don't apply to the page type are skipped, and the score is rescaled to 100.
- **Top 3 fixes:** of the failed or partial checks, pick the ones with the highest `weight × (1 − score)`. If two are equal, pick the one that sits higher on the page.

| # | Check | Wt | How to detect on a section/element page | One-line fix |
|---|---|---|---|---|
| 1 | Single goal | 6 | All buttons and links (excluding the legal footer) point to the same action/URL/anchor. No nav menu section. | Remove the nav and off-goal links. Point every CTA to the one goal. |
| 2 | Outcome headline | 7 | The first heading (H1) in the first section names a result. It is not the brand name, a product name alone, or "Welcome". It contains a verb or outcome noun and ideally a number or timeframe. | Rewrite as "[Outcome] in [Time] without [Pain]". |
| 3 | Subheadline explains who/how | 4 | A text element directly under the H1, 10–35 words, not a paraphrase of the H1. | Add who it's for + mechanism + time/effort. |
| 4 | CTA above the fold | 6 | A primary button or form exists in the hero section within the first ~750px on mobile. | Move or add the primary CTA into the hero. |
| 5 | Specific CTA copy | 4 | The button label is not "Submit/Click here/Sign up/Learn more". It is 2–5 words and verb-led. | Use "Get My [Thing]" / "Save My Seat" / "Get Instant Access — $X". |
| 6 | CTA repetition fits the length | 3 | Count primary CTAs vs page height. Short pages: 1–2. Long pages: at least 1 per ~2 mobile screens after the offer, plus one at the end. | Add CTAs after the offer, the guarantee and the FAQ, and at the end. |
| 7 | Micro-copy reduces anxiety | 3 | Small text within 1 element of the primary CTA mentioning privacy, guarantee, instant access, or no card. | Add "Instant access · No spam · 30-day guarantee". |
| 8 | Proof above the fold | 4 | The hero contains a rating, count, logo strip or short quote. | Add "Join 4,200+ students" or a 1-line testimonial. |
| 9 | Testimonials are specific and real-looking | 6 | Testimonial elements have a name and photo, and ≥ 50% contain a number or timeframe. Count: opt-in ≥ 1, sales low ≥ 3, high ≥ 6. | Add a name, face and result line. Ask the user for real quotes, never invent. |
| 10 | Proof near CTAs | 3 | A testimonial or stat is adjacent (the same or the neighbouring section) to ≥ 50% of the CTAs after the first. | Put one testimonial directly above each repeat CTA. |
| 11 | Benefits stated as outcomes | 4 | The bullet list exists. ≥ 60% of bullets contain "so you/how to/without/in X" or similar outcome language. | Rewrite features as "feature, so you can benefit". |
| 12 | Offer clarity | 5 | Sales and checkout pages: what's included is listed, the price is visible, the format and access are stated. Opt-ins: the lead magnet format is named and shown. | Add a "What you get" list + a mock-up + the price. |
| 13 | Value framing | 3 | Sales pages: a value stack or anchor (component values, comparison) and/or a payment plan for $300+. | Add a value stack with honest component values. Add a payment plan. |
| 14 | Risk reversal | 5 | A guarantee element exists near the price/CTA on sales, checkout and upsell pages. Privacy line on opt-ins. | Add a named, time-boxed guarantee badge + 2 sentences. |
| 15 | Objection handling / FAQ | 4 | Sales and application pages: an FAQ with ≥ 5 items covering price, time, fit, access and refund. | Add an FAQ answering the top 5 objections. |
| 16 | Form friction | 6 | Opt-in ≤ 2 fields. Registration ≤ 3. Checkout (digital) ≤ 7 and no password. Application ≥ 5 questions is OK only as multi-step. Labels visible (not placeholder-only). | Remove fields. Make phone optional or drop it. Split into steps. |
| 17 | Readability | 5 | Estimated Flesch-Kincaid grade ≤ 7. Average sentence ≤ 20 words. Paragraphs ≤ 3 sentences. Hype words count = 0. | Shorten sentences and swap jargon for customer words. |
| 18 | Scannability | 3 | Every section has a meaningful heading. No text block > 80 words without a break. Lists are used where there are ≥ 3 items. | Add descriptive subheads and break text into bullets. |
| 19 | Message match | 4 | If the traffic source or ad text is known: the H1 shares ≥ 2 key terms with it. If unknown: skip. | Echo the ad's promise words in the H1. |
| 20 | Visual of product/person | 3 | An image in the hero showing the product mock-up, the creator or the result (not a generic stock or abstract image). | Add a product mock-up or the creator photo. |
| 21 | Mobile fitness | 4 | Single column under 600px. Buttons ≥ 44px tall. Body ≥ 16px. No horizontal overflow. Form in the first screen on opt-ins. | Stack the columns and enlarge the buttons and text. |
| 22 | Speed hygiene | 3 | Hero image ≤ 300 KB and sized. ≤ 1 video, with a facade. No autoplay background video. Below-fold images lazy. | Compress, lazy-load, replace autoplay with a poster. |
| 23 | Accessibility basics | 3 | Text and button contrast ≥ 4.5:1. Images have alt. One H1. Inputs have labels. | Fix the contrast tokens, add alt and labels. |
| 24 | Trust and disclosure | 3 | Footer has privacy/terms/contact. Checkout shows the total, recurring terms, a secure-payment indicator and payment logos. The creator is identified. | Add the legal footer, total and recurring terms, and the secure badge. |
| 25 | Honest urgency only | 3 (penalty) | If there is a countdown, scarcity or "only N left" text, a real deadline or cap must be configured (date, evergreen per-visitor deadline enforced at checkout, or inventory). Otherwise **fail, and deduct an extra 10 points**. | Remove fake urgency or wire it to a real deadline. |

The weights add up to 104. Normalise to 100.

**Score bands**
- **85–100:** ready to launch.
- **70–84:** good. Fix the top 3.
- **50–69:** major gaps (usually proof, offer clarity or form friction).
- **< 50:** restructure using the page-type playbook.

**Page-type applicability:** checks 12–15 are skipped for thank-you pages, check 13 for opt-ins, and checks 4–6 adapt for checkout pages (where the form is the CTA).

**Top-3 output format (for the AI):**
`[Section name] — problem (check #) → specific fix with proposed copy`
Example: `Hero — CTA says "Submit" (#5) → change to "Send Me the Free Plan" and add "Instant access. No spam." beneath.`

---

## 5. Ethical guardrails (hard rules: the AI must refuse or flag)

**Legal backdrop**
- FTC final rule on fake reviews and testimonials (16 CFR Part 465, in force from October 2024). It bans:
  - fake or AI-generated reviews, and reviews from people with no real experience
  - buying reviews of a set sentiment
  - insider reviews without disclosure
  - company-controlled "independent" review sites
  - suppressing negative reviews
  - fake social-media indicators
- Civil penalties apply.
- FTC report "Bringing Dark Patterns to Light" (2022) names fake countdown timers, false "limited time" claims, false low-stock messages and fake activity messages ("39 people viewing") as deceptive.
- The UK CMA forced Booking.com, Expedia and others to stop false scarcity and pressure selling.
- EU Omnibus Directive / UCPD (fake reviews), the DSA (dark patterns on platforms), and the FTC negative-option / click-to-cancel rules for subscriptions.

**The AI must never:**
1. **Invent testimonials, reviews, names, photos, results, student counts, ratings or logos.**
   - Use clearly marked placeholders, for example `[Testimonial from a real client: name, photo, specific result]`.
   - Ask the user for real proof.
   - If proof is missing, use honest substitutes: the creator's own results, a "founding member" framing, credentials, process transparency, or a guarantee.
2. **Add a countdown timer or deadline unless a real one exists.**
   - Allowed: a cart close date, an event start time, a launch bonus that really expires, or an evergreen deadline that is genuinely per-visitor and enforced (the price actually changes after it).
   - Never allowed: timers that reset on reload.
3. **Claim scarcity that isn't real.** "Only 5 spots" needs to be literally true (coaching capacity, cohort size).
4. **Use fake anchors.** "Was $497" requires that the product was actually sold at $497. A value stack must use defensible values (the price it is or was sold for separately, or a reasonable market rate), and is labelled "value".
5. **Use confirmshaming decline links** ("No, I don't want to be rich"). Use neutral declines.
6. **Pre-check order bumps or add-ons,** hide recurring charges, or bury subscription terms. Recurring price, frequency and cancellation method go next to the button.
7. **Make income or health claims without substantiation.** Atypical results need a typical-results disclosure. No "guaranteed income". No cures or medical claims for wellness products.
8. **Hide the price or fees** until the last step on purpose (drip pricing).
9. **Use fake social-activity popups** ("Jane from Ohio just bought") unless they come from real purchase data.
10. **Use deceptive two-step tricks.** If the opt-in leads to a paid offer, the page must not imply the paid item is free.

**Spirit:** urgency and scarcity are powerful *because* they are real. Ethical alternatives:
- Launch windows
- Cohort start dates
- Price increases at a real date
- Fast-action bonuses with a real expiry
- Limited 1:1 capacity

Accessibility, honest pricing and a real guarantee are conversion levers, not compliance costs.

---

## 6. Sources

**Benchmarks and data**
- Unbounce Conversion Benchmark Report 2024 (57M conversions, 41k pages; reading level, mobile): https://unbounce.com/conversion-benchmark-report/
- Unbounce report coverage (mobile gap 83% / 8%, 3+ syllable words −24.3%): https://searchenginejournal.com/new-report-reveals-an-8-mobile-landing-page-conversion-gap/557513
- Unbounce press release: https://www.newswire.ca/news-releases/unbounce-s-2024-conversion-benchmark-report-proves-that-attention-spans-are-declining-and-so-are-conversion-rates-831617439.html
- Baymard: cart abandonment rate and reasons: https://baymard.com/lists/cart-abandonment-rate
- Baymard: checkout usability benchmark (form elements 23.48 avg vs 12 ideal): https://baymard.com/blog/ecommerce-checkout-usability-report-and-benchmark
- Baymard: reduce cart abandonment (guest checkout): https://baymard.com/blog/reduce-cart-abandonment
- Baymard: inline form validation: https://baymard.com/research-articles/inline-form-validation
- Baymard: mobile forms, avoid inline labels: https://baymard.com/blog/mobile-forms-avoid-inline-labels
- Baymard: perceived security of payment form / trust seals: https://baymard.com/blog/perceived-security-of-payment-form
- Think with Google, page load statistics (1→3 s = +32% bounce probability): https://thinkwithgoogle.com/data/page-load-time-statistics
- Portent site speed study 2022: https://www.portent.com/blog/analytics/research-site-speed-hurting-everyone.htm
- HubSpot / Dan Zarrella, form fields analysis (40k pages): https://blog.hubspot.com/blog/tabid/6307/bid/6746/which-types-of-form-fields-lower-landing-page-conversions.aspx
- Optional vs required phone field case: https://disruptiveadvertising.com/landing-pages/optional-form-fields
- Multi-step vs single-step form test: https://conversionfanatics.com/?p=499
- ON24 webinar benchmarks: https://www.on24.com/blog/webinar-success-metrics-how-do-you-know-youve-delivered-a-winning-experience/
- Upsell / OTO / bump take rates (vendor data): https://focus-digital.co/average-upsell-conversion-rate-2026-report/ , https://www.samcart.com/blog/the-complete-guide-to-order-bumps , https://systeme.io/glossary/order-bump/

**UX research**
- NN/g, Scrolling and attention (57% above fold, 74% first two screens): https://www.nngroup.com/articles/scrolling-and-attention/
- NN/g, F-shaped pattern: https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- NN/g, Trustworthy design (4 trust factors): https://www.nngroup.com/articles/trustworthy-design/
- WebAIM Million: https://webaim.org/projects/million/
- Click-Away Pound 2019: https://www.clickawaypound.com/downloads/CAP2019PR2.pdf
- WCAG 2.2 target size (2.5.8): https://dequeuniversity.com/rules/axe/4.8/target-size

**Copy and CRO practice**
- Unbounce, attention ratio: https://unbounce.com/?p=27315
- Unbounce, 4 U's headline check: https://unbounce.com/copywriting/gut-check-your-landing-page-headlines/
- AWAI, 4 U's: https://www.awai.com/2001/06/a-review-of-the-4-us/
- Copyhackers / Joanna Wiebe, voice of customer and message mining: https://www.weidert.com/blog/tips-for-creating-content-that-converts-an-interview-with-joanna-wiebe , https://wistia.com/learn/marketing/joanna-wiebe-conversion-copywriting
- ContentVerve/Unbounce "my vs your" CTA test: https://clickz.com/me-vs-you-how-pronouns-affect-click-conversion-rates/32596/
- MECLABS "Request a free copy" CTA test: https://sherpablog.marketingsherpa.com/?p=25021
- MECLABS "clarity trumps persuasion": https://customerthink.com/b2bsummit_day_one_from_orlando_five_marketing_truths_from_flint_mcglaughlin/
- Conversion Rate Experts × Moz long page (+52%): https://conversion-rate-experts.com/moz-case-study/
- 37signals Highrise A/B tests (person photo pages): https://signalvnoise.com/posts/2991-behind-the-scenes-ab-testing-part-3-final
- Spiegel Research Center reviews (via summary): https://lipscore.com/blog/product-reviews-increase-your-online-sales-by-270/
- Guarantee anecdotes: https://quicksprout.com/what-converts-better-free-trial-versus-money-back-guarantee
- Eugene Schwartz awareness levels: https://blog.adbeat.com/5-levels-customer-awareness/
- Hormozi $100M Offers summaries (value equation, guarantees, MAGIC): https://www.supersummary.com/100m-offers/section-3-summary/ , https://www.supersummary.com/100m-offers/section-4-summary/
- Russell Brunson, DotCom Secrets (squeeze page, two-step, OTO): https://www.goodreads.com/notes/25054961-dotcom-secrets/66454885-fernando-ferreira-junior?page=4
- StoryBrand SB7 website framework: https://knapsackcreative.com/blog/a-deep-dive-into-storybrands-website-framework
- Thank-you page practice: https://leadpages.com/blog/thank-you-pages-confirmation-pages , https://optinmonster.com/11-ways-to-increase-conversion-rates-on-your-thank-you-pages/
- High-ticket application funnels: https://www.zenler.com/blog/high-ticket-sales-funnel-qualification

**Ethics and law**
- FTC final rule banning fake reviews and testimonials (2024): https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials
- FTC "Bringing Dark Patterns to Light" (summary): https://www.venable.com/insights/blogs/2022/09/the-ftc-brings-more-light-to-dark-patterns-in-new
- CMA hotel booking commitments (pressure selling): https://cms.law/en/gbr/legal-updates/cma-secures-commitments-from-holiday-booking-sites-on-sales-practices

**Evidence caveats**
- Several widely repeated stats could not be traced to a primary source and were left out or tagged [Weak]: the "Expedia removed one field = $12M" story, Highrise "+102.5%", and "testimonials +34%".
- The Spiegel 270% figure is vendor-funded and correlational.
- Order bump, OTO and opt-in benchmarks are vendor aggregates.
- Treat all of the above as starting hypotheses to A/B test, not as laws.
