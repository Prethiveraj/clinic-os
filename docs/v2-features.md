# V2 feature additions — competitive gap analysis vs. Amello

Companion to `requirements.md`. This doesn't replace anything already scoped — it's what to add once the MVP (search → score → demo → checkout → domain) is validated with real paying clinics, per the build-order rule already established. Read `requirements.md` first; this assumes that schema and stack.

Amello (amello.ai) runs a similar "growth OS" model for restaurants: connects to real business data and automates five things. Mapped against the current clinic spec:

| Amello pillar | Status in current spec |
|---|---|
| Intelligence/trend analysis | Partially covered — `scores` is already versioned over time (§4/§7 of requirements.md), so a trend view is mostly a dashboard UI job, not new backend. |
| Local SEO auditing | Already core to the product — the score dashboard *is* this. |
| Customer retention (lapsed-customer win-back) | Listed in phase 2 but currently under-built — see §3 below, this needs a schema addition to actually work. |
| Reputation management (review monitoring + AI-drafted responses) | **Not in current spec.** New in this doc, §1. |
| Social media automation | **Not in current spec.** New in this doc, §2. |

---

## 1. Reputation management (new — high priority for v2)

Natural fit: you already pull `reviews`/`reviewSummary` from the Places API for the Reviews sub-score (requirements.md §7). Extending that into a real feature:

- **Review inbox**: surface each clinic's recent Google reviews in their dashboard (already-fetched data, just needs a UI and a scheduled refresh).
- **AI-drafted reply suggestions**: for each review, generate a suggested reply via OpenAI — polite, specific to what the reviewer mentioned, never defensive on negative reviews, no admission of medical fault or clinical claims (same guardrail discipline as the site-generation prompt in `site-generation.md`). Owner edits and copies the reply to post on Google themselves in v1 — direct-post via the Google Business Profile API is a later step once you're verified for that API's higher-trust tiers.
- **Sentiment summary**: a short AI-generated rollup ("mostly positive, wait times mentioned twice this month") on the dashboard — cheap, high perceived value.

Schema addition:
```
reviews
  id
  clinic_id (fk)
  google_review_id
  author_name
  rating
  text
  review_time
  suggested_reply (nullable, AI-generated)
  fetched_at
```

## 2. Social media automation (new — lower priority, phase 3)

Amello generates posts about bestselling dishes from POS data. Clinics don't have an equivalent sales feed, so the trigger has to come from what you do have: services listed in `site_content`, health-awareness calendar dates (e.g., World Oral Health Day for a dental clinic — category-matched), and score/review milestones ("just crossed 50 five-star reviews"). Generate a caption + simple on-brand graphic (template + clinic name/logo overlay, not full image generation) that the owner downloads and posts manually in v1. Same no-fabricated-claims guardrail applies to captions as to site copy.

Lower priority than §1 — reputation management reuses data you already have; this needs new content triggers and asset generation.

## 3. Fixing customer retention (phase 2 item, needs a schema gap closed first)

The original plan listed "patient recall/follow-up sequences" but the current schema only captures `leads` (contact-form/click-to-call submissions) — it has no record of who actually became a patient or when they last visited, so there's no way to know who's "lapsed." Retention automation is impossible without that.

Two options, pick one before building this:
- **Minimal**: add a `patients` table the clinic owner can manually mark leads as "converted" into, with a `last_visit_date` they update themselves. Cheap, no integration, but relies on manual owner upkeep.
- **Real**: integrate with whatever appointment/booking or clinic-management software the clinic already uses (many Indian clinics run on tools like Practo, Plexus, or a basic Google Calendar) — meaningfully more engineering, no point building until you know which systems your actual paying clinics use.

Recommend starting minimal; revisit once you have real clinics and can see what they actually run.

## 4. Landing page differentiation pattern (borrow the structure, not the brand)

Amello's comparison table ("why not just use ChatGPT") is a strong conversion pattern worth adapting: a table contrasting your product against the two realistic alternatives a clinic owner actually considers — doing it themselves with a generic AI chatbot, or hiring a traditional web/marketing agency. Full landing page brief is in `landing-page-v2-prompt.md`.

## Build order note

Same discipline as before: none of §1-2 justify delaying MVP validation. If anything, §1 (reputation management) is cheap enough — it reuses data already being fetched — that it could ride along with MVP rather than waiting, if you want one differentiating v2 feature ready at launch. §2 and the "real" option in §3 should wait for paying clinics.
