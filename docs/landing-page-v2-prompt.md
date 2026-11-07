# Landing page v2 — build prompt for Claude Code

Paste this directly to Claude Code as the instruction for rebuilding `/(marketing)/page.tsx` (per `requirements.md` §13). Section structure below is modeled precisely on a reference landing page the product owner liked (a restaurant-growth SaaS) — same rhythm and layout logic, rebuilt with original copy, an original color palette, and clinic-appropriate content. Do not reuse the reference's brand name, logo, exact color values, or copy text; do not name or visually imitate any competitor in the shipped page.

---

## Visual system

- Palette: do **not** reuse red/black (that reads as another brand's mark). Use a healthcare-appropriate palette instead — a deep navy or teal as the dark/accent color, warm off-white body background, one accent color used sparingly (buttons, highlighted words, checkmarks). Trustworthy and clinical, not alarming — avoid red as a primary accent given the medical context.
- Typography: bold, large serif or serif-adjacent display type for headlines (the reference uses a warm serif for headline emphasis words), clean sans-serif for body copy.
- Photography: real human photography for the hero (a clinician — doctor/dentist/physio — in a clean, well-lit setting, not a stock-y white-coat cliché), and abstract/aspirational imagery (not literal clinic photos) for the mid-page alternating rows — the reference uses sky, desert, ocean; pick calm, clinical-adjacent abstracts (soft clouds, clean architectural light, water) that read as "clarity and growth" rather than "hospital."
- Motion: subtle scroll-reveal on section entry, no aggressive animation.

## Section-by-section build

**1. Nav** — logo left, single "Login" button right, transparent over the dark hero, solid on scroll.

**2. Hero** (full-bleed dark background, clinician photo bleeding off the right edge with a dark gradient overlay on the left for text legibility)
- Small pill badge, top-left of the text block: honest framing only — e.g. "Built for Indian clinics" — never a fabricated user count. Leave this as a CMS-editable string so a real number can drop in later without a redeploy.
- Headline: one bold line stating the outcome, with one or two words in the accent color for emphasis (reference pattern: "The AI that knows your restaurant" → clinic equivalent should name the *clinic* and the *outcome*, e.g. something like "The growth system that knows your clinic" — final wording is copy work, not this prompt's job, but keep the same shape: short, second-person-adjacent, outcome-first).
- Below the headline: a live search input (placeholder "Enter your clinic name") + a solid CTA button ("Find My Clinic"). Wire this to the real `/api/clinics/search` endpoint from `requirements.md` — this is the actual product, not a decorative mockup, exactly like the reference's "Find my Restaurant" search.
- Small helper microcopy under the search box, e.g. "Can't find your clinic? Try adding your city." — same reassurance pattern as the reference's "Can't find it? Add your benefits" line, adapted.

**3. Intro statement** — plain white/off-white background, centered, muted-gray paragraph (3-4 sentences) stating the problem: clinic growth depends on visibility, reviews, and follow-up, but that data is scattered across Google, their site (if any), and word of mouth — and that's what this product unifies. No heading needed, matches the reference's quiet transitional paragraph between hero and first feature block.

**4. "Handles everything so you don't have to" hub panel**
- Centered heading, one word in the accent color (matching the reference's "Amello handles everything" pattern).
- One large rounded panel on a warm/soft gradient background containing: a central UI screenshot (the real score dashboard or demo-site preview, not a mockup illustration) with small floating badge icons around it representing real integrations — Google (Places/Business Profile), and once built, WhatsApp — connected to the center with thin lines. Only show integrations that are real or firmly planned; do not depict integrations (e.g. Instagram/Facebook auto-posting) that aren't shipped yet.
- Below the panel: a 3-column feature row — **Score & Visibility** / **Reputation** / **Growth** — each a short label + one-sentence description, mirroring the reference's Intelligence/Reputation/Growth three-up but scoped to what's actually live at launch per `requirements.md` and `v2-features.md` §1.
- Below that: a small "Powered by" logo row showing real underlying tech/data sources — Google, OpenAI, Razorpay — not decorative AI-brand logos unrelated to the actual stack.

**5. Reputation management showcase** (this replaces the reference's "manages your social media" section — social auto-posting is phase 3 per `v2-features.md` §2 and shouldn't be shown as live; reputation management is the real, shippable v2 feature per `v2-features.md` §1, so it takes this slot)
- Heading: "[Product] manages your reputation like a pro" pattern, one word in accent color.
- 3-4 short sub-claims in a row, each tied to something real: turns raw Google reviews into a simple inbox, drafts a reply so the owner never stares at a blank box, flags anything urgent, tracks sentiment over time.
- One large full-width banner image/screenshot below: a phone or dashboard view showing the review inbox with an AI-drafted reply visible — real product screenshot once built, not a stock photo of a phone.

**6. Three alternating outcome rows** ("more traffic, more bookings, more repeat patients" framing)
- Row 1 — text left, abstract image right: "Turn nearby searches into appointment requests" — about the score/visibility engine surfacing them in local search.
- Row 2 — image left, text right: "Go from lead to booked appointment without the back-and-forth" — about the booking/contact conversion tools from `requirements.md` §1 (click-to-call, WhatsApp, contact form).
- Row 3 — text left, abstract image right: "Bring patients back for follow-ups" — about the recall/retention feature. Keep this claim scoped to what's real per `v2-features.md` §3 (don't overclaim automated recall if only the minimal manual-tagging version has shipped).

**7. Trust/social proof banner**
- Dark full-width card, repeat CTA button, heading "Real clinics. Real results." (or similar — honest framing, no invented number).
- Logo row below: leave this **empty/hidden** until there are real clinic logos or partner logos to show, per `v2-features.md` §4 — do not ship placeholder or fabricated logos. Build it as a CMS-editable slot that's simply not rendered if no logos are configured, rather than a visibly empty row.

**8. Comparison table** — "A generic AI can write your website copy. We run your growth."
- Two-column table, our column visually emphasized (accent color, checkmarks), the alternative column neutral gray.
- Compare against the two realistic alternatives a clinic owner actually weighs: doing it themselves with a general AI chatbot, and hiring a traditional web/marketing agency — not a named competitor product.
- Rows (adapt wording, keep the axes verifiable and non-fabricated): knows your actual clinic data vs. generic prompting; takes action (generates a live site, tracks score) vs. only gives advice; covers search + reviews + booking in one place vs. piecemeal; shows a measurable score/change over time vs. no way to measure; cost for a single clinic — use defensible general ranges for agency cost/time, never invented specific numbers.

**9. FAQ** — "Questions, answered." heading left with a small "still have questions? contact us" link, accordion list right. 6-7 questions: what it costs, contract length/lock-in, what happens to an existing website/domain, whether technical knowledge is needed, how long setup takes, whether the clinic truly owns their site/domain, and explicit mention of Razorpay/UPI payment support (important trust signal for this audience).

**10. Footer** — dark background matching the hero, logo + one-line tagline, link columns (Product, Company, Contact), repeat CTA, social links if any exist.

## Technical + honesty constraints (apply throughout)

- The hero search box and the final-CTA search box both hit the real `/api/clinics/search` endpoint — reuse the existing Turnstile + rate-limiting from `requirements.md` §10, since this page is now the highest-traffic entry point to that endpoint.
- Every screenshot/UI element shown must be a real product screenshot once available — use clearly-labeled "coming soon" placeholders during development rather than fake polished mockups that overpromise.
- Nothing on this page states or implies a feature is live if it isn't shipped yet — cross-check every claim against `requirements.md` and `v2-features.md` before finalizing copy.
- No fabricated numbers anywhere (user counts, review counts, savings percentages) — every stat is either real or the section is omitted.
- Mobile-first: the hero search interaction must work cleanly on a phone keyboard, since most traffic here will be mobile.
