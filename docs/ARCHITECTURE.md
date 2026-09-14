# Outly — Architecture v5.1

**Final implementation architecture. This supersedes v5 and is the implementation source of truth.**

v4 is not a redesign. Every architectural decision from v2 → v3 → v3.1 that was correct is preserved unchanged: the layered monolith, the atomic capacity guard, GeoJSON from day one, explicit organizer request and admin approval, `/api/v1` versioning, the deterministic discovery scorer, the phase ordering, and every security and integrity rule.

**What v4 does is close the gap between the architecture and the project rubric.** Ten capabilities that were absent, deferred, or under-specified are now integrated into the MVP: a fifth implemented model, dashboard statistics built on MongoDB aggregation, server-to-server integrations, an AI feature, admin approval of users, Twilio SMS, a documented hook architecture, a documented Git workflow, and an explicit UI-framework decision.

**The MVP boundary moved — deliberately and for the first time.** v3.1's MVP closed after Phase 6 with four models and no AI, SMS, admin approval or dashboard statistics. v4's MVP still closes after Phase 6, but Phase 6 now includes everything the rubric requires. §25 states the new boundary; §33 audits it line by line.

**v5 is a consistency and finalization revision, not a redesign.** No feature was added, no scope expanded, no technology changed. It does three things: it makes **a verified email address a hard prerequisite for booking, reviewing and requesting organizer capability**; it removes every stale concept left behind by earlier revisions — general user approval, `organizerEnabled`, `requireApproved`, and the language of self-service "organizer activation"; and it resolves every remaining contradiction, including the one that claimed an organizer rejection should end a member's session.

**§18 is now the single authoritative statement of authorization** — five primitives, one six-persona matrix, and an exhaustive `tokenVersion` policy. Every route guard, error code, test and phase in this document conforms to it.

**Status:** frozen. This is the implementation baseline. Phase 0 may begin on confirmation.

---

## 1. What carried over unchanged

Reviewed across three revisions and still correct. Do not revisit.

- Single React SPA + single Express API monolith. **No microservices, no gateway, no queues, no Redis, no Kafka, no Kubernetes.**
- Feature-based frontend structure; TanStack Query owns all server state; one Axios client; no Redux/Zustand.
- Backend service layer — controllers never touch Mongoose models directly.
- MongoDB + Mongoose, on Atlas.
- Server-authoritative price, capacity, booking-state and permission decisions.
- Consistent success/error envelope on every response.
- **Activity is one concrete, scheduled instance** — not a reusable template.
- **MVP is free-only** (`price` must be `0`, enforced server-side). Paid booking is Phase 7, gated on a real gateway.
- **The atomic capacity guard** — a single conditional `findOneAndUpdate` folding status, time and capacity into one document operation (§8). Untouched by v4.
- **GeoJSON `Point` + `2dsphere` from day one**, city-string filter in MVP, `$geoNear` deferred.
- `bookingReference` and lifecycle timestamps on activities and bookings.
- **Explicit organizer request and admin approval** — no capability is granted as a side effect of an unrelated action, and none is self-service.
- **Deterministic, explainable discovery scoring.** v4 adds an AI layer *on top of* it and does not replace it (§14).
- **Roles remain two:** `user` and `admin`. Organizer stays a capability (`organizerStatus`), not a role.
- **Tailwind is the UI framework** (§22). No second component library.
- Progressive complexity: prove discover → book → attend before anything advanced.

---

## 2. Changelog

### v2 → v3 · the seven approved corrections

| # | Change |
|---|---|
| **D1** | `role` narrowed to `'user' \| 'admin'`; a single field became the sole organizer capability (`organizerEnabled` in v3–v4, `organizerStatus` from v4.1) |
| **D2** | `Category.mood` — flat enum of five values, no tree |
| **D3** | `Activity.categorySlug` — denormalised, server-set |
| **D4** | Partial unique index on `{user, activity}` where `status: 'confirmed'`; `quantity ≤ 4` |
| **D5** | Completion derived from `schedule.endDateTime`, written by one scheduled job |
| **D6** | Email transport to Phase 1; deployment at the end of Phase 1 |
| **D7** | `location.geo` replaced `location.coordinates` |

Plus: compensating rollback on the booking write, guarded cancellation, three distinguishable booking error codes, `npm run reconcile`, activity-cancellation cascade, published-activity edit restrictions, `tokenVersion` + logout + password reset, aggregation-based discovery scoring, twelve correctly-shaped indexes, a frozen error registry, validated query parameters, and testing and deployment added to the phase plan.

### v3 → v3.1

| # | Change |
|---|---|
| **R1** | `Review` formally specified as the fifth model, scheduled P1 |
| **R2** | §3 separated Architecture/Technical Design from UI/UX Design |

### v3.1 → v4 · rubric integration

Ten changes. Every one lands **inside the MVP**.

| # | Change | Where |
|---|---|---|
| **V1** | **`Review` moves from P1 into the MVP** as the fifth implemented model, built in Phase 6 after the completion job that gates its eligibility rule. `ratingAvg` / `ratingCount` stop being dormant seams and become live denormalised counters. | §9, §13, §19, §24, §26 |
| **V2** | **Admin approval of users**, with admin approve and reject endpoints. *(Superseded by v4.1 below: approval now gates organizer status only, not ordinary use.)* | §7, §19, §24 |
| **V3** | **Organizer and admin dashboards with real statistics**, served by dedicated aggregation endpoints. No figure is computed in the browser. | §15, §19, §24 |
| **V4** | **MongoDB aggregation is the stated mechanism for every statistic** — `$match`, `$facet`, `$group`, `$sum`, `$avg`, `$cond`, `$dateToString`, `$densify`, `$lookup` with sub-pipeline, `$sort`, `$project`. §15 names which operator produces which number. | §15 |
| **V5** | **Server-to-server communication consolidated** into `services/external/` behind one shared HTTP client with timeout, bounded retry, key handling and error mapping. Cloudinary, Nodemailer, Twilio and the AI provider all go through it. | §16 |
| **V6** | **AI refinement of discovery results** — the deterministic scorer ranks; AI explains *why* each result fits, in a separate non-blocking call that degrades to a templated explanation when unavailable. | §14, §16 |
| **V7** | **Twilio SMS** for booking confirmation, booking cancellation and activity cancellation, behind a notification service. **SMS failure can never fail a booking.** | §16, §17 |
| **V8** | **React hook architecture documented** — custom hooks, each wrapping one endpoint through the `queryKeys` factory. | §22 |
| **V9** | **Git and GitHub workflow documented** as a process requirement, not a runtime feature. | §28 |
| **V10** | **Tailwind explicitly named as the UI framework**, with the decision not to add a second one recorded. | §22 |

### v4 → v4.1 · authorization correction

Two changes. Everything else in v4 is preserved exactly.

| # | Change | Why |
|---|---|---|
| **W1** | **Admin approval applies to organizer requests only.** Registering, browsing, discovery, **booking** and **reviewing** need no approval. | v4 gated the *seeker* — the user who most needs to get in within thirty seconds — and reached the organizer only incidentally. The person who needs verifying is the one publishing an activity and collecting strangers' bookings. A member who books a pottery class risks their own evening; an unvetted organizer is a risk to everyone who books with them. Marketplaces that put people in a room together vet hosts, not guests. |
| **W2** | **`organizerEnabled` + `approvalStatus` → one `organizerStatus`** (`none` / `pending` / `approved` / `rejected`). `organizerVerified` dropped, `requireApproved` deleted. | v4 allowed `organizerEnabled: true, approvalStatus: 'rejected'` — a state with no meaning that nothing prevented. This is D1's own reasoning applied again: two fields encoding one fact will drift, so do not have two. |

Consequences that follow, all in §7 unless noted: `POST /organizer/activate` becomes `POST /organizer/request` and grants nothing · the request carries a message and optional link so the admin has something to judge · the admin queue shows the applicant's booking history · rejection no longer bumps `tokenVersion`, because a refused applicant still has a perfectly good member account · a 30-day cooldown before re-applying · admin endpoints move to `/admin/organizer-requests` (§19) · two error codes replaced (§20) · one index re-keyed (§13) · the admin dashboard counts organizer requests rather than user approvals (§15) · tests rewritten, including a regression test asserting a brand-new account can book immediately (§26).

**No change to:** models, booking integrity, atomic capacity, JWT/refresh design, validation approach, discovery and scoring, AI, Twilio, email, dashboards and aggregation, hooks, Tailwind, phases, MVP boundary, or deployment.

### v4.1 → v5 · final consistency and the verified-member model

Three changes. Nothing else moved.

| # | Change | Why |
|---|---|---|
| **X1** | **A verified email is required before booking, before managing a booking, before submitting a review, and before requesting organizer capability.** `requireVerified` is now a real guard on those routes, not a policy note. | Each of those actions either commits a seat someone else could have taken, attaches a public statement to a member's name, or asks an administrator to spend time. All three need a reachable person behind them. Browsing stays open, so the product keeps its first impression. |
| **X2** | **Every obsolete approval and activation concept removed from the active architecture.** `approvalStatus`, `organizerEnabled`, `organizerVerified`, `requireApproved` and the language of self-service "organizer activation" survive only in this changelog and the migration note (§7). | Four revisions left sediment. A document that still describes a deleted field is a document an implementer will follow into a bug. |
| **X3** | **`tokenVersion` policy made exhaustive, and the rejection contradiction removed.** It is bumped on exactly three events — logout, password reset, password change — and explicitly **not** on organizer rejection. | v4 bumped it on account rejection, which no longer exists. A rejected applicant is a fully valid member; ending their session would tell them they had been removed from the platform. |

Consequences, all already applied: §18 rewritten as the single authorization authority with a six-persona matrix · booking create and cancel, review write, and the organizer request gain `requireVerified` (§19) · two error codes renamed and one added (§20) · the completion job moves from Phase 6 to Phase 3 so the booking lifecycle is finished in one phase and Phase 6 carries no intra-phase dependency (§24) · seed accounts are verified, with two deliberately unverified to exercise the gate (§26) · tests added for every gate and for direct-API bypass attempts (§26).

**No change to:** the five models, booking integrity and atomic capacity, the organizer approval model introduced in v4.1, discovery and deterministic scoring, AI, Twilio, email, dashboards and aggregation, hooks, Tailwind, MVP boundary, deployment, or the ~35-day schedule.

### v5 → v5.1 · discovery axes and an open-ended schedule

| # | Change | Why |
|---|---|---|
| **Y1** | **`Activity.energyLevel`** (`low`/`medium`/`high`, default `medium`) — a second axis, independent of `level`. | `level` is the skill floor; `energyLevel` is physical demand. A beginner hike is `beginner` + `high`. Without both, "something gentle this evening" is unanswerable — and that is exactly what a tired, bored user asks. |
| **Y2** | **`Activity.moods: [String]`** — 1–3 of the five `Category.mood` values, seeded server-side from the category, multikey-indexed. | v5 derived mood from the single category, forcing every activity into exactly one. A photography walk is `create` **and** `outdoors`. |
| **Y3** | **No fixed deadline.** Day figures become relative sizing; phases close on definition of done. The UI/UX track (§3) is scheduled alongside Phases 2–4. | The schedule was the project's only real risk. Removing the deadline removes it — provided scope stays fixed, which §24 now states explicitly. |

Both fields are **filters, not scoring components**, so the five discovery weights stay at 1.00 and need no re-tuning (§14). One new index (§13). No new endpoint: `GET /discover` already does mood/time/budget ranking and `POST /discover/explain` already carries the LLM layer, so there is nothing to stub now and swap later.

**Considered and rejected:** a stored `estimatedDuration` — it duplicates `endDateTime - startDateTime` and would silently disagree with the schedule the first time an organizer reschedules. Duration is derived, like `seatsRemaining`.

**No change to:** the five models, booking integrity, authorization, the organizer model, AI, Twilio, email, dashboards, hooks, Tailwind, MVP scope, or the 26 Must-Haves.

### Scope impact — stated plainly

v4 roughly doubles the MVP. Honest estimate for a solo developer:

| Phase | v3.1 | v4 | Added |
|---|---|---|---|
| 0 Foundation | 2 d | 2 d | — |
| 1 Auth, profile, email, deploy | 3 d | **4 d** | admin approval state + approve/reject + minimal admin users screen |
| 2 Categories, activity read, discovery, seed | 4 d | 4 d | — |
| 3 Booking + atomic capacity | 4 d | 4 d | — |
| 4 Organizer + Cloudinary + dashboards | 3 d | **6 d** | organizer + admin dashboards, six aggregation pipelines |
| 5 "I'm bored" discovery + AI | 2 d | **5 d** | AI service, explanation endpoint, fallback, caching, tests |
| 6 Notifications + SMS + completion + Review | 3 d | **6 d** | Twilio, Review model + API + rating recompute + tests |
| Hardening, tests, docs, final deploy | 3 d | **4 d** | more surface to test |
| **Total** | **24 d** | **35 d** | **+11 d** |

At six working days a week that is roughly six weeks. **The MVP cannot be trimmed without failing the rubric**, so the float that used to sit in Phase 5 is gone. If time pressure appears, the only safe reductions are inside features — fewer dashboard charts, one AI endpoint instead of two, SMS on two triggers instead of three — never the removal of a capability.

---

## 3. Scope: Architecture vs UI/UX design

**This document is the technical design. It is not the UI/UX design.** They are two disciplines, two documents, and two review cycles, and conflating them is how a project ends up with a database schema arguing about button colours — or a beautiful screen flow that no endpoint can serve.

### What belongs where

| Architecture / technical design — **this document** | UI/UX design — **a separate document** |
|---|---|
| Data model, field types, relationships, indexes | User research, personas, jobs-to-be-done |
| Data integrity invariants and how they are enforced | Information architecture and navigation structure |
| API contracts: routes, payloads, status codes, envelope | Screen inventory, wireframes, user flows as screens |
| Authentication and authorization rules | Visual design: typography, colour, spacing, iconography |
| State machines and lifecycle transitions | Component library, design tokens, states as *visual treatments* |
| Service boundaries and folder structure | Interaction design, motion, transitions |
| Frontend state-management strategy and caching | Microcopy, tone of voice, error message wording |
| Error code taxonomy | Responsive breakpoints and layout behaviour |
| Validation rules | Accessibility: contrast, focus order, target sizes, screen-reader labels |
| Development phases, testing, deployment | Usability testing and iteration |

### Where the two meet

Three places, and in each the split is clean:

| Concern | This document defines | The UI/UX document defines |
|---|---|---|
| Loading / empty / error states | that **every data view must handle all four states** — a technical contract (§22) | what each state *looks like*, and what it *says* |
| "I'm bored" discovery | the parameters, the scoring function, the ranked response (§14) | the wizard's screens, step order, transitions, and how a mood is pictured |
| Errors | the **code** (`SOLD_OUT`) and the HTTP status (§20) | the **copy** the user reads ("This one just filled up — here are three like it") |

### Rules that keep the boundary honest

1. **Architecture decisions never encode visual choices.** Naming Tailwind as the styling mechanism is a technical decision; the tokens, scale and palette are not.
2. **UI/UX never invents data the API does not return**, or assumes state the backend does not hold. A screen showing "12 people are going" requires a field that exists in §5.
3. **On conflict:** the API contract is authoritative for *data shape and availability*; the UI/UX document is authoritative for *presentation and language*. Where a screen genuinely needs data the API lacks, that is a change request against this document — not something the frontend fabricates.
4. **Phase 0's "shared UI kit" is a scaffold, not a design system.** `Spinner`, `EmptyState`, `ErrorState`, `Button` exist so no component has an excuse to improvise a loading state. Their visual design comes from the UI/UX track and can be restyled without touching a single architectural decision.

### Status of the UI/UX track

Not yet produced. It is a **parallel deliverable** (`docs/UX.md`, or a design file), not a downstream one — it can and should be developed alongside Phases 1–2 rather than after them. Nothing in this document blocks on it, and nothing in it should change anything in this document.

---

## 4. System architecture

The shape is unchanged. v4 adds two outbound integrations; it adds no layer, no process and no infrastructure.

```
┌───────────────────────────────────────┐
│              React SPA                 │
│  Vite · React Router · TanStack Query  │
│  Axios · Tailwind · custom hooks       │
└──────────────────┬────────────────────┘
                   │ REST · JWT Bearer · /api/v1
                   │ httpOnly refresh cookie (cross-site)
┌──────────────────▼────────────────────┐
│             Express REST API           │
│   Routes → Middleware → Controllers    │
│        → Services → Mongoose           │
├────────────────────────────────────────┤
│ Middleware: auth · approval · authorize│
│   validate · rateLimit · error         │
├────────────────────────────────────────┤
│ services/external/  ← ALL server-to-   │
│   one HTTP client:    server calls     │
│   timeout · retry · key handling       │
├────────────────────────────────────────┤
│ jobs/    completion job (Phase 6)      │
│ scripts/ seed · reconcile · createAdmin│
└──────────────────┬────────────────────┘
                   │
   ┌───────┬───────┼────────┬───────────┐
   ▼       ▼       ▼        ▼           ▼
MongoDB Cloudinary Nodemailer Twilio  AI provider
 Atlas   (images)   (email)   (SMS)   (explanations)
   │
   └─ 2dsphere · aggregation pipelines · one transaction
```

**Every secret lives on the server.** The browser holds no Cloudinary key, no Twilio credential, no AI key, and no database string. The frontend's only outbound destination is the Express API.

**No queue, no cache server, no gateway, no second process.** The AI call is synchronous within one request and bounded by a timeout; SMS and email are dispatched after the response and are allowed to fail.

---

## 5. Domain model — `activities`

An Activity is **one concrete, scheduled instance**. "Badminton" is a category; "Sunday Beginner Badminton — 6 PM" is the Activity record.

```js
{
  _id,
  title,                          // 5–120
  description,                    // 50–5000
  organizer:     ObjectId → users,      // immutable after create
  category:      ObjectId → categories,
  categorySlug:  String,          // D3 — denormalised, server-set, never from the client
  tags:          [String],        // max 10, lowercased
  images: [{                      // max 5
    url:      String,
    publicId: String              // required — without it the asset can never be deleted
  }],
  mode:  'online' | 'offline',
  level: 'beginner' | 'intermediate' | 'advanced',   // skill floor
  energyLevel: 'low' | 'medium' | 'high',            // physical demand, default 'medium'
  moods: [String],                                   // 1–3 of the five Category.mood values
                                                     //   seeded server-side from the category;
                                                     //   the organizer may add up to two more

  location: {                     // omitted entirely when mode = 'online'
    address: String,
    city:    String,              // indexed — the only location filter in MVP
    geo: {                        // D7
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }   // [longitude, latitude]
    }
  },

  price:       Number,            // MVP: must be 0, enforced server-side
  currency:    'INR',
  capacity:    Number,            // integer ≥ 1
  seatsBooked: Number,            // derived counter, default 0, min 0, updated atomically

  schedule: {
    startDateTime: Date,
    endDateTime:   Date
  },

  ratingAvg:   Number,            // default 0 — live in MVP, maintained by review.service (§9)
  ratingCount: Number,            // default 0 — live in MVP

  status: 'draft' | 'published' | 'cancelled' | 'completed',
  publishedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,     // required when status = 'cancelled'
  completedAt: Date,              // written by the Phase 6 completion job (D5)

  createdAt, updatedAt
}
```

**Virtuals (not stored):** `seatsRemaining = capacity - seatsBooked` · `isFull` · `isBookable`.

**Never settable from a request body**, at any time, by anyone: `organizer`, `categorySlug`, `status`, `seatsBooked`, `ratingAvg`, `ratingCount`, `publishedAt`, `cancelledAt`, `completedAt`. The `validate` middleware strips them (§21). This is the single most important rule in the Activity module.

`categorySlug` earns its keep twice: it lets discovery scoring compare against `user.interests` without a join (§14), and it lets the dashboard group activities by category with no `$lookup` at all (§15).

**`energyLevel` is not `level`.** `level` is the skill floor — can a beginner keep up. `energyLevel` is physical demand — will this tire me out. They are genuinely independent: a beginner hike is `beginner` + `high`; an advanced chess class is `advanced` + `low`. Collapsing them would make "something gentle this evening" unanswerable, which is precisely the question a tired, bored user asks.

**`moods` is an array because activities are not single-purpose.** A photography walk is `create` **and** `outdoors`; a run club is `move` and `socialise`. v5 derived mood from the single category, which forced every activity into exactly one. The array is seeded server-side from `category.mood` so it is never empty, the organizer may add at most two more from the fixed five, and it is multikey-indexed (§13). Same denormalisation pattern as `categorySlug`, same reason: it removes a join from the hottest query.

**Duration stays computed, not stored.** `endDateTime - startDateTime` is the duration; a stored `estimatedDuration` would silently disagree with the schedule the first time an organizer reschedules, and every "fits my afternoon" filter would then lie. It is derived where needed — `timeMatch` in §14, `durationHours` in the AI payload (§16) — exactly as `seatsRemaining` is derived from `capacity - seatsBooked`.

---

## 6. `categories` — new in v3

Referenced by `activities.category`, by `users.interests`, and by the `/discover` mood step. v2 never defined it.

```js
{
  _id,
  name:         String,           // "Pottery"
  slug:         String,           // "pottery" — unique, lowercase, URL-safe
  mood:         String,           // D2 — 'move'|'create'|'learn'|'socialise'|'outdoors'
  icon:         String,
  displayOrder: Number,           // default 0
  isActive:     Boolean           // default true
}
```

**Mood is a flat enum tag, not a parent reference.** The set is closed at five, so a tree buys nothing and costs a depth guard, recursive population and a class of orphan bugs. "Surprise me" in the discovery wizard means *no mood filter*, not a sixth value.

**Categories are never hard-deleted.** `isActive: false` hides a category from creation and browse while leaving existing activities coherent.

### Seed taxonomy (Phase 2)

| Mood | Categories |
|---|---|
| `move` | zumba · cardio · calisthenics · yoga · strength-training · badminton · table-tennis · football · cricket · basketball · karate · muay-thai · taekwondo · kickboxing |
| `create` | painting · pottery · resin-art · drawing · photography |
| `learn` | coding-workshop · photography-workshop · language-workshop · public-speaking |
| `socialise` | board-games · book-club · networking · community-meetup |
| `outdoors` | hiking · running · cycling · nature-walk · camping · weekend-trip |

Thirty-three categories across five moods. This is handwritten seed data, not generated — it is the product's vocabulary.

---

## 7. `users`, roles, and organizer approval

```js
{
  _id,
  name,
  email,                          // unique, lowercase
  passwordHash,                   // bcrypt cost 12, select: false

  role: 'user' | 'admin',         // D1 — exactly two roles

  organizerStatus: 'none' | 'pending' | 'approved' | 'rejected',   // default 'none'
  organizerRequest: {             // what the admin actually reviews
    message:     String,          // 30–500 — "what will you run?"
    contactLink: String,          // optional https URL — site, Instagram, studio page
    requestedAt: Date
  },
  organizerReviewedBy:   ObjectId → users,
  organizerReviewedAt:   Date,
  organizerRejectionReason: String,   // required on rejection, max 300, shown to the user

  phone:     String,              // optional, E.164, e.g. "+919876543210"
  smsOptIn:  Boolean,             // default false — SMS requires phone AND opt-in

  avatarUrl,
  interests: [String],            // category slugs, max 15 — feeds discovery scoring
  city:      String,              // feeds locationMatch scoring

  isEmailVerified: Boolean,       // default false
  emailVerificationTokenHash,     // select: false
  emailVerificationExpires,       // select: false
  passwordResetTokenHash,         // select: false
  passwordResetExpires,           // select: false
  tokenVersion: Number,           // default 0 — bumping invalidates every issued token

  createdAt, updatedAt
}
```

### Two roles, one organizer field

| Concept | Field | Answers |
|---|---|---|
| **Tier** | `role` | Is this a member or staff? |
| **Organizer capability and its approval state** | `organizerStatus` | May this member publish activities, and where is their request? |

An organizer is a **member whose request to publish has been approved** — not a third role. There is no moderator role and there will not be one.

**`organizerStatus` is one field doing one job** — it carries both the capability and the state of the request that granted or refused it. The reasoning is D1's: **two fields encoding one fact will drift, so do not have two.**

> *Historical note.* Earlier revisions split this across a boolean capability flag, a separate platform-standing field and a reserved "verified" flag, which made contradictory combinations representable. Those fields no longer exist anywhere in this architecture; see the §2 changelog and the migration note below.

```
requireOrganizer  ⇔  organizerStatus === 'approved'  ||  role === 'admin'
```

### Who needs approving — and who does not

> **Ordinary members are never gated by an administrator.** Registering, browsing, searching, running discovery, **booking**, cancelling and **reviewing** need no approval from anyone — only a verified email address (§18). Admin approval applies to **one thing**: becoming an organizer.

This is the correction v4.1 exists to make. v4 gated booking and reviewing behind admin approval of the person, which put an administrator between a bored user and the thirty-second experience the whole product is built around — and reached the organizer only incidentally.

The person who actually needs verifying is the one **publishing an activity, collecting strangers' bookings, and telling them where to show up**. A member who books a pottery class risks their own evening. An unvetted organizer is a risk to everyone who books with them. So the gate belongs at supply, not demand — which is how every marketplace that puts people in a room together works: guests are not vetted, hosts are.

**Booking, reviewing and requesting organizer capability additionally require a verified email address** (§18). Publishing requires `organizerStatus === 'approved'`. **§18 holds the complete six-persona authorization matrix** — it is not repeated here.

### The organizer request flow

```
Verified member → "Become an organizer"        requireAuth + requireVerified
   → writes a short message: what they plan to run, where, how often
     plus an optional link — a studio page, an Instagram, a personal site
   → POST /api/v1/organizer/request
        organizerStatus: 'none' → 'pending'
        organizerRequest: { message, contactLink, requestedAt }
        ⚠ grants nothing. The member's own access is unchanged.

Admin opens the request queue on the admin dashboard and sees, per request:
   the message and link · the account's age, city and interests
   · email-verified state · booking history (has this person actually
     attended anything?) · any previous rejection and its reason

   → PATCH /admin/organizer-requests/:id/approve
        organizerStatus: 'approved' → the organizer workspace unlocks
        → approval email

   → PATCH /admin/organizer-requests/:id/reject   { reason }   (required)
        organizerStatus: 'rejected'
        → email with the reason
        ⚠ tokenVersion is NOT bumped, and this is deliberate (§18). The
          account remains a fully valid verified member — they keep browsing,
          booking, cancelling and reviewing. Only the request was refused,
          not the account. Ending their session would tell them, incorrectly,
          that they had been removed from the platform.
```

**The queue is not a rubber stamp.** An approval screen with nothing on it but a name is a button an admin clicks without thinking. The request message, the optional link and the account's own booking history are what make the decision real — and the booking history is the most useful signal of all, because someone who has attended four activities is demonstrably a participant rather than a drive-by signup.

**Re-application.** A rejected member may submit a new request after a **30-day cooldown**, enforced in `organizer.service.js` against `organizerReviewedAt` — not by a rate limiter, because it is a business rule rather than an abuse control. The API returns `details.canReapplyAt` so the UI can say when. The admin sees the previous rejection and its reason alongside the new request.

**Requesting from a state that does not permit it** returns a specific error rather than silently doing nothing: a second request while one is open → `409 ORGANIZER_APPLICATION_PENDING`; a request from an already-approved organizer → `409 ALREADY_ORGANIZER`; a request inside the cooldown → `403 ORGANIZER_APPLICATION_REJECTED` with `details.canReapplyAt` (§20).

**No auto-approval, ever.** There is no environment flag that approves requests automatically. A backdoor that grants publishing rights without review is the one shortcut that would make the whole control decorative.

### Migration

`scripts/migrateOrganizers.js`, run once:

- every existing user → `organizerStatus: 'none'`
- every user who was already publishing activities → `organizerStatus: 'approved'`, with `organizerReviewedAt` set to their first activity's `createdAt` so the audit trail is not empty

Nobody is locked out and nobody silently loses a capability they were already exercising. Defaulting live organizers to `pending` would take an entire supply side offline overnight — the classic way this kind of field gets introduced badly.

### Authorization primitives

```
requireAuth         valid access token · user exists · tokenVersion matches
requireVerified     isEmailVerified === true
requireOrganizer    organizerStatus === 'approved'  ||  role === 'admin'
requireAdmin        role === 'admin'
requireOwnership    resource.organizer.equals(req.user._id) || role === 'admin'
```

Composed per route, never merged into one catch-all guard; **§18 is the authoritative definition and matrix.** The distinction that matters most is unchanged: `requireOrganizer` says "an approved organizer may edit activities"; it does **not** say "this organizer may edit *this* activity." Only `requireOwnership` says that, and both are always applied together on owned resources.

### Security notes

- `organizerStatus`, `organizerReviewedBy`, `organizerReviewedAt` and `organizerRejectionReason` are **never** settable through `PATCH /users/me`, or through any route other than the two admin endpoints. Enforced by the `validate` whitelist (§21). `organizerRequest` is writable only by the request endpoint, and only from `none` or `rejected`.
- An admin cannot approve or reject **their own** request — `403 CANNOT_SELF_MODERATE`.
- **Email verification is required to request**, which raises the cost of a throwaway account applying for publishing rights.
- Requesting while a request is already `pending` returns `409 ORGANIZER_APPLICATION_PENDING` rather than silently resetting `requestedAt` and jumping the queue.
- The rejection reason is shown to the rejected member, so it is written for them — it is user-facing copy, and the wording belongs to the UI/UX track (§3).
- `organizerStatus` is **not** carried in the JWT (§18). It is read per request, so an approval takes effect on the member's very next call rather than after a token refresh — and a revocation, if one is ever needed, is equally immediate.

---

## 8. Booking state machine and atomic capacity

```js
{
  _id,
  bookingReference: String,       // unique, human-friendly, e.g. "ACT-8F4K2P"
  user:     ObjectId → users,
  activity: ObjectId → activities,
  organizer: ObjectId → users,    // denormalised — organizer queries skip a lookup

  quantity:   Number,             // integer 1–4 (D4)
  unitPrice:  Number,             // 0 in MVP — Phase 7 seam
  totalPrice: Number,             // server-calculated, 0 in MVP — Phase 7 seam

  status: 'confirmed' | 'cancelled' | 'completed',
  paymentStatus: 'not_required',  // only possible value until Phase 7

  confirmedAt: Date,
  cancelledAt: Date,
  cancelledBy: 'user' | 'organizer' | 'system',   // new in v3 — drives cascade + email copy
  cancellationReason: String,
  completedAt: Date,              // written by the Phase 6 job only (D5)

  activityStartAt: Date,          // denormalised — sorts "My Bookings" without a lookup

  createdAt, updatedAt
}
```

**No `pending` state exists in the free-booking flow.** Confirmed bookings consume capacity; cancelled bookings release it; completed bookings retain historical seat usage and change nothing.

### The write path

```
POST /api/v1/bookings   { activityId, quantity }

1  requireAuth
2  validate: activityId is a valid ObjectId; quantity is an integer 1–4

3  ATOMIC RESERVE  ◄── unchanged from v2. This mechanism is correct.

   const activity = await Activity.findOneAndUpdate(
     {
       _id: activityId,
       status: 'published',
       'schedule.startDateTime': { $gt: new Date() },
       $expr: { $lte: [ { $add: ['$seatsBooked', quantity] }, '$capacity' ] }
     },
     { $inc: { seatsBooked: quantity } },
     { new: true }
   );

   The match and the increment are one atomic single-document operation, so
   two concurrent requests cannot both claim the last seat. The filter also
   matches on _id, so the $expr costs nothing — it is a primary-key lookup.

4  IF null → re-read the activity ONCE to classify the failure:      [new in v3]
        not found            → 404 ACTIVITY_NOT_FOUND
        status !== published → 409 ACTIVITY_UNAVAILABLE
        startDateTime passed → 422 BOOKING_CLOSED
        otherwise            → 409 SOLD_OUT
   One extra query, error path only. v2 returned a single conflated code, so
   the client could not tell "it filled up" from "it was cancelled".

5  MATERIALISE
   Booking.create({ user, activity, organizer, quantity,
                    unitPrice: 0, totalPrice: 0, status: 'confirmed',
                    confirmedAt: now, activityStartAt: activity.schedule.startDateTime,
                    bookingReference: generate() })

6  COMPENSATE ON FAILURE  ◄── missing in v2, and required          [new in v3]
       E11000 on bookingReference → regenerate, retry (max 3 attempts)
       E11000 on {user, activity} → $inc seatsBooked by -quantity
                                     → 409 ALREADY_BOOKED
       any other error            → $inc seatsBooked by -quantity
                                     → rethrow, log LOUDLY (should never fire)

7  RESPOND 201 { booking, seatsRemaining }
```

**Why reserve before create.** Creating the booking first and then checking capacity reintroduces exactly the race the guard exists to eliminate. Reserving first holds the seat before anything else can happen; the only remaining risk is an orphaned increment, which step 6 corrects. A rare, self-correcting over-count is strictly better than an oversell: an over-count shows one fewer seat than exists, while an oversell means two people arrive for one place.

### The cancel path

```
PATCH /api/v1/bookings/:id/cancel

1  Booking.findOneAndUpdate(
     { _id, user: req.user._id, status: 'confirmed' },        ◄── the guard
     { status: 'cancelled', cancelledAt: now, cancelledBy: 'user' },
     { new: true }
   )
   → null ⇒ not yours, or already cancelled ⇒ 404 / 422 CANNOT_CANCEL
            and NO decrement runs

2  reject with 422 BOOKING_CLOSED if activityStartAt <= now

3  Activity.updateOne(
     { _id: activityId, seatsBooked: { $gte: booking.quantity } },  ◄── floor guard
     { $inc: { seatsBooked: -booking.quantity } }
   )
```

**Guarding on the booking's status transition is what makes double-cancellation harmless.** v2 guarded on ownership and time only, so two clicks on Cancel meant two decrements and a negative `seatsBooked` — a direct violation of its own stated invariant. The second request now matches nothing, returns `null`, and never reaches step 3. The `$gte` floor is a second, cheap backstop.

### `bookingReference`

Generated server-side at creation: `ACT-` plus six characters from an unambiguous alphabet (no `0`/`O`, no `1`/`I`/`l`). Unique-indexed, with retry on collision per step 6. Used in emails, organizer dashboards, and future payment receipts.

---

## 9. `reviews` — the fifth model · **implemented in the MVP**

**Five models ship in the MVP: `User`, `Category`, `Activity`, `Booking`, `Review`.** v3.1 specified Review and deferred it to P1; v4 builds it, in Phase 6, immediately after the completion job that its eligibility rule depends on.

Review is not a model added to reach a number. It closes the product's core loop — *discover → book → attend → review* — and it is what makes `ratingAvg` on an activity mean anything, which in turn feeds the organizer dashboard (§15) and the `rating` sort in discovery (§14).

```js
{
  _id,
  user:      ObjectId → users,
  activity:  ObjectId → activities,
  organizer: ObjectId → users,       // denormalised — organizer aggregate rating
                                     //   without a two-hop lookup
  booking:   ObjectId → bookings,    // the proof of eligibility

  rating:   Number,                  // integer 1–5, required
  comment:  String,                  // optional, 10–1000 when present

  isEdited: Boolean,                 // default false
  isHidden: Boolean,                 // default false — admin soft-moderation,
                                     //   never a hard delete
  organizerReply: {
    text:      String,               // max 500
    repliedAt: Date
  },

  createdAt, updatedAt
}
```

### Eligibility — the rule that makes ratings mean anything

A review may be created only when **all three** hold:

1. the author's email is **verified** (`requireVerified`, §18),
2. a `Booking` exists for `(user, activity)` with `status: 'completed'`, and
3. the activity itself is `completed`.

Note what is **not** on that list: admin approval, and `organizerStatus`. Any verified member who actually attended may review, whatever their organizer standing (§7). The completed-booking requirement is a far stronger anti-spam control than an approval queue — you cannot review something you did not turn up to — and verification ensures a real address stands behind a public statement.

Booking completion is written by the Phase 6 completion job (D5), so eligibility composes with the existing lifecycle and introduces no new mechanism. A booking that was `cancelled` never reaches `completed`, so cancelling out of an activity forfeits the right to review it — which is correct. Enforced in `review.service.js`, never in a controller.

**One review per eligible booking.** The unique index below is the enforcement; the eligibility check is the friendly error.

### Indexes

```js
{ user: 1, activity: 1 }        unique      // one review per user per activity
{ activity: 1, createdAt: -1 }              // the review list on a detail page
{ organizer: 1, rating: -1 }                // organizer aggregate rating
```

The unique index is the same pattern as `bookings` (§13): the constraint lives in storage, so a duplicate is impossible rather than merely checked.

### Rating aggregation — `ratingAvg` and `ratingCount`

Both fields live on `activities` (§5), default to `0`, and are **never settable from a request body**. On every review create, edit, delete or hide, `review.service.js` recomputes them with a MongoDB aggregation over that activity's visible reviews and `$set`s the result:

```js
Review.aggregate([
  { $match: { activity: activityId, isHidden: false } },
  { $group: { _id: '$activity',
              ratingAvg:   { $avg: '$rating' },
              ratingCount: { $sum: 1 } } },
  { $project: { _id: 0,
                ratingAvg:   { $round: ['$ratingAvg', 2] },
                ratingCount: 1 } }
])
```

**Recompute by re-aggregation, never by incremental arithmetic.** `avg = (avg·n + r) / (n + 1)` is faster and drifts on every edit and deletion; with hiding and editing both supported, drift is guaranteed rather than theoretical. Review volume per activity is small, so correctness wins. An activity with no visible reviews resets to `ratingAvg: 0, ratingCount: 0`, not to `null`.

### Organizer reply

One reply per review, by the organizer who owns the activity (`requireOwnership`). Replies are not reviews — they carry no rating, do not affect aggregates, and cannot be replied to. This is the smallest form of right-of-reply that is worth having.

### Authorization summary

| Action | Guard |
|---|---|
| Read reviews for an activity or organizer | public |
| Create a review | `requireAuth + requireVerified` + eligibility check |
| Edit own review | `requireAuth + requireVerified` + author + within 7 days |
| Delete own review | `requireAuth + requireVerified` + author |
| Hide any review | `requireAdmin` (sets `isHidden`, never a hard delete) |
| Reply to a review | `requireAuth + requireVerified + requireOrganizer + requireOwnership` of the activity |

### Deferred

No review voting or helpfulness scores · no threaded replies beyond the single organizer reply · no photo attachments · no dedicated moderation UI (admins hide through the admin surface; a full queue is Phase 8).

---

## 10. Data integrity invariants

Four invariants define correctness. Everything in §8 and §9 exists to hold them.

| # | Invariant | Enforced by |
|---|---|---|
| **I1** | `0 ≤ seatsBooked ≤ capacity` at all times, under any concurrency | Atomic conditional `$expr` guard on increment; `$gte` floor guard on decrement |
| **I2** | `seatsBooked === Σ quantity of confirmed bookings` for that activity | Reserve-then-materialise ordering + compensating rollback + reconciliation |
| **I3** | At most one `confirmed` booking per `{user, activity}` | Partial unique index — enforced at the **storage** layer, so it holds even if the application logic is wrong |
| **I4** | `activity.ratingAvg` / `ratingCount` equal the aggregate of that activity's **visible** reviews | Re-aggregation on every review write (§9); at most one review per `{user, activity}` by unique index |

### Reconciliation — `npm run reconcile`

A **script, not a cron job.** Two passes:

1. **Seats.** For every activity, `$group` the confirmed bookings, compare the sum to `seatsBooked`, correct any mismatch and log it with the activity id and both values.
2. **Ratings.** For every activity with `ratingCount > 0`, recompute from visible reviews and correct any drift the same way.

Roughly sixty lines, no infrastructure. It repairs drift from any path that failed compensation, and it is **evidence** — a clean run is a standing proof that the concurrency and aggregation designs hold. It is also the natural companion to the Phase 3 concurrency suite and the Phase 6 review tests.

### Referential integrity

MongoDB does not enforce it, so policy does:

- **Nothing is hard-deleted.** Activities cancel, categories deactivate, bookings cancel, reviews hide, users are rejected. Dangling references become impossible by construction.
- Every read that follows a reference tolerates a missing target — a `populate` returning `null` must not crash a list render.
- Organizer and admin queries are always **scoped at the query** (`find({ organizer: req.user._id, ... })`), never "find by id, then check the owner". Scoping removes an entire class of data leak rather than catching it. This applies with equal force to the dashboard aggregations in §15, whose very first stage is always a `$match` on the caller's own id.
- Secrets are `select: false` at the schema, so a forgotten projection cannot leak a hash.

---

## 11. Lifecycle rules

### Activity

```
draft ──publish──► published ──(endDateTime passes)──► completed
  │                    │
  └──cancel──►    cancelled ◄──cancel──┘
```

| Transition | Trigger | Effects |
|---|---|---|
| `draft → published` | `PATCH /organizer/activities/:id/publish` | sets `publishedAt`; requires all publishable fields present |
| `draft → cancelled`<br>`published → cancelled` | `DELETE /organizer/activities/:id` | sets `cancelledAt`, `cancellationReason`; **cascades — see below** |
| `published → completed` | Phase 6 scheduled task | sets `completedAt` |

**Completion is derived in MVP (D5).** An activity whose `schedule.endDateTime` has passed is treated as complete by every query. The `completed` status and `completedAt` are written by **one** scheduled task introduced in Phase 6, alongside the email reminders that need scheduling anyway. Until Phase 6 they are documented-future, not silently dead — which is what they were in v2.

**Cancellation cascades** (new in v3). v2 set the activity's status and left confirmed bookings untouched, so attendees kept a valid-looking booking for an activity that was not happening. In v3, cancelling an activity:

1. sets the activity to `cancelled` with a required reason,
2. sets every `confirmed` booking on it to `cancelled` with `cancelledBy: 'organizer'` and the same reason,
3. leaves `seatsBooked` as-is (the activity is dead; the counter is now historical),
4. creates the notification payloads that Phase 6 emails.

Because this touches many documents together, it is **the one place a transaction is justified**. Atlas runs a replica set on every tier, so `session.withTransaction` is available. Emails are sent *after* the transaction commits, never inside it.

### Edits to a published activity

v2 placed no restriction on `PUT /organizer/activities/:id`, so capacity could be cut below `seatsBooked` — an instant violation of I1 — and the start time could be moved silently under everyone who had booked.

| Field | Once published |
|---|---|
| `capacity` | may only **increase**; `409 CAPACITY_BELOW_BOOKED` if reduced below `seatsBooked` |
| `schedule`, `location`, `mode` | permitted; flagged for attendee notification in Phase 6 |
| `title`, `description`, `images`, `tags`, `level` | freely editable |
| `price` | must remain `0` until Phase 7 |
| `organizer`, `status`, `seatsBooked`, `categorySlug`, timestamps | never settable from a body |

### Booking

```
confirmed ──user or organizer cancels──► cancelled
    │
    └──(activity completes, Phase 6 job)──► completed
```

Booking completion is derived from the activity's completion. There is no check-in or attendance flow in MVP.

---

## 12. Geolocation

```js
location: {
  address: String,
  city:    String,
  geo: {                                              // D7
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }   // [longitude, latitude]
  }
}

activitySchema.index({ 'location.geo': '2dsphere' });
```

- `mode === 'offline'` ⇒ `location.address`, `location.city` and `location.geo.coordinates` are all required.
- `mode === 'online'` ⇒ `location` is omitted entirely. A single-field `2dsphere` index is sparse by default, so documents without the field are simply absent from the index — this is correct and needs no `sparse: true`, which would change other semantics.

**`[longitude, latitude]` — longitude first.** This is the most common geospatial bug in MongoDB and it fails *silently*: coordinates swapped for Kochi (9.93 N, 76.27 E) land in Somalia, and every distance query returns nothing, with no error anywhere. Three defences, all cheap:

1. API parameters are named `lat` and `lng` explicitly — never an ambiguous `coords` array.
2. A single `toGeoPoint(lat, lng)` helper in `utils/geo.js` constructs every point, including in the seed script. One function, one place to be wrong.
3. A schema validator rejects `coordinates[0]` outside ±180 or `coordinates[1]` outside ±90, and a Phase 2 test asserts a known seeded distance.

**MVP filters by `city` only** — a plain indexed string match. No map, no radius. Because the geometry is stored correctly from day one, adding `$geoNear` in Phase 8 is a query-layer change, not a migration. That was the right call in v2 and it stands.

**Privacy.** Activity locations are public venue addresses; publishing them is the point. `users.city` is a label, not a point — no user coordinates are stored anywhere in the MVP schema, so there is nothing to leak.

---

## 13. Indexes

Twenty-one indexes, all created in the MVP.

```js
// activities
{ status: 1, 'schedule.startDateTime': 1 }                        // default feed
{ status: 1, category: 1, 'schedule.startDateTime': 1 }           // category browse
{ status: 1, 'location.city': 1, 'schedule.startDateTime': 1 }    // city filter
{ organizer: 1, status: 1, 'schedule.startDateTime': -1 }         // organizer list + dashboard
{ status: 1, moods: 1, 'schedule.startDateTime': 1 }              // multikey — mood filter (§14)
{ status: 1, ratingAvg: -1 }                                      // sort=rating (§14)
{ 'location.geo': '2dsphere' }                                    // Phase 8
{ title: 'text', tags: 'text' }                                   // keyword search

// bookings
{ bookingReference: 1 }                          unique
{ user: 1, activity: 1 }                         unique,
        partialFilterExpression: { status: 'confirmed' }          // D4 — enforces I3
{ activity: 1, status: 1 }                                        // attendee list, reconcile
{ user: 1, activityStartAt: -1 }                                  // My Bookings
{ organizer: 1, createdAt: -1 }                                   // dashboard trends (§15)

// reviews
{ user: 1, activity: 1 }                         unique            // enforces I4
{ activity: 1, createdAt: -1 }                                     // detail-page review list
{ organizer: 1, rating: -1 }                                       // organizer rating

// categories
{ slug: 1 }                                      unique
{ mood: 1, displayOrder: 1 }                                       // discovery wizard

// users
{ email: 1 }                                     unique
{ interests: 1 }                                 multikey           // discovery scoring
{ organizerStatus: 1, 'organizerRequest.requestedAt': 1 }            // admin request queue (§7)
```

**New in v4:** `{status, ratingAvg}` on activities (the `rating` sort), `{organizer, createdAt}` on bookings (dashboard trends), the three review indexes, and `{organizerStatus, organizerRequest.requestedAt}` on users (the organizer-request queue). Every one exists because a specific query in §14, §15 or §19 needs it — none is speculative.

**Compound key order follows ESR** — equality fields, then sort fields, then range fields. Verify with `.explain('executionStats')` against the seeded dataset in Phase 2 and again in Phase 4 once the dashboard pipelines exist, and confirm `IXSCAN`, not `COLLSCAN`.

**MongoDB permits one text index per collection.** The compound `title` + `tags` index is it.

`autoIndex` is `true` in development and **`false` in production**; production indexes are created once by a script or through Atlas.

---

## 14. Discovery — deterministic scoring, AI refinement

```
/discover
   ↓  Mood       Move · Create · Learn · Socialise · Outdoors · Surprise me
   ↓  Energy     Gentle · Moderate · Full-on · Doesn't matter
   ↓  Time       1–2 hrs · Half day · Full day · Weekend
   ↓  Budget     Free · Under ₹500 · ₹500–₹2,000 · Any
   ↓  Ranked matching activities   ← deterministic, always
   ↓  "Why this fits you"          ← AI, additive, never blocking
```

`GET /api/v1/discover?mood=&energy=&time=&budget=&city=&page=&limit=` returns the same `Activity` documents in the same envelope as regular discovery. No parallel data model.

### Ranking is deterministic. This does not change.

```
score = 0.40 × categoryMatch      // activity.categorySlug ∈ user.interests,
                                  //   or requested mood ∈ activity.moods
      + 0.20 × locationMatch      // user.city === activity.location.city, or mode === 'online'
      + 0.15 × budgetMatch        // constant 1.0 in MVP (see note)
      + 0.15 × popularity         // seatsBooked / capacity, capped at 1
      + 0.10 × timeMatch          // activity duration fits the selected window
```

Weights sum to exactly 1.00. Each component is a plain `0–1` value. Three properties of this design are load-bearing and v4 preserves all three:

1. **The score is computed in an aggregation pipeline**, with `$addFields` / `$switch`, followed by `$sort`, `$skip`, `$limit` — so pagination is correct. Scoring in Node would require fetching the entire candidate set and would make `meta.page` and `totalPages` meaningless.
2. **`popularity` is the fill ratio**, `min(seatsBooked / capacity, 1)` — bounded 0–1, needs no global maximum, and does not change depending on which page an activity appears on.
3. **Anonymous users score a neutral 0.5**, not 0, on `categoryMatch` and `locationMatch` when there is no signal. Scoring 0 would collapse every anonymous result to an identical score and destroy the ranking.

**`mood` and `energy` are filters, not scoring components.** They narrow the candidate set in the `$match` stage; they do not add weighted terms. This is deliberate — the five weights above sum to exactly 1.00 and were tuned as a set, and adding components would mean re-tuning all of them for no gain. A user who asks for "gentle" does not want high-energy results ranked slightly lower; they want them gone.

**A note that will otherwise be debugged as a bug:** `budgetMatch` is `1.0` for every candidate in the free-only MVP. A constant adds the same value to every score, so it **does not affect ranking** — it only shifts all scores by `0.15`. This is intentional; the component and the API parameter are retained so Phase 7's paid activities slot in without a redesign.

`sort=rating` joins the discovery sort enum in the MVP now that `ratingAvg` is live (§9), backed by the `{status, ratingAvg}` index (§13).

### AI refinement — additive, never on the critical path

**The AI does not rank, select, filter, or invent anything.** The deterministic scorer decides what the user sees and in what order. The AI's only job is to answer, in one sentence per result, *why this fits you* — turning an opaque number into something a bored person can act on.

This is the right division because it is the one thing the language model is genuinely better at than a scoring function, and because a failure in it costs the user nothing.

```
1  Browser calls GET /discover          → deterministic results render IMMEDIATELY
2  Browser then calls POST /discover/explain with the returned activity ids
3  Backend → services/external/ai.service.js → AI provider
4  Explanations arrive and attach to the already-rendered cards
5  If step 3 fails, times out, or AI is disabled → templated explanations
   generated from the score components the deterministic scorer already produced
```

Results never wait for the model. There is no loading state in which the page is empty because of AI.

**Endpoint**

```
POST /api/v1/discover/explain          requireAuth, rate-limited 10/min/user

request   { "activityIds": ["...", "..."],           // max 10, must come from a
            "context": { "mood": "create",           //   prior /discover response
                         "time": "half-day",
                         "budget": "free" } }

response  { "success": true,
            "data": { "explanations": [ { "activityId": "...",
                                          "reason": "Hands-on and calm — a good fit
                                                     for a free half-day if you like
                                                     making things." } ],
                      "source": "ai" | "template",
                      "degraded": false } }
```

**What is sent to the provider — and what is not.** For each activity: title, `categorySlug`, `moods`, `level`, `energyLevel`, `mode`, city, duration in hours. Plus the three wizard selections. **No user id, no name, no email, no phone, no location coordinates, no booking history, no other user's data.** The prompt describes activities and a mood; it never describes a person. This keeps the integration free of personal data by construction rather than by policy.

**Output validation.** The model is instructed to return JSON only, at temperature 0, capped at ~300 tokens. The response is parsed and validated with Zod before anything is returned:

- every `activityId` must be a member of the set that was sent — a hallucinated id is dropped, not returned;
- `reason` is trimmed, capped at 200 characters, and stripped of markup;
- a malformed or unparseable response is discarded entirely and the templated path runs instead.

**Fallback — the design that makes AI safe to depend on.** The deterministic scorer already computes `categoryMatch`, `locationMatch`, `popularity` and `timeMatch` per activity. A template turns the highest-contributing components into a sentence: *"Matches your interest in Pottery · in Kochi · half-day."* So **there is always an explanation**. `source: "template"` tells the client which path produced it; the UI need not distinguish them, and the product is fully usable with `AI_ENABLED=false`.

**Caching and cost control.** Identical `(activityIds, context)` pairs are cached for one hour in an in-memory `Map` with TTL — no Redis. A per-user rate limit of 10/min and a process-wide `AI_DAILY_CALL_CAP` bound spend; when the cap is hit the endpoint returns templated explanations and logs a warning. `AI_ENABLED=false` is a hard kill switch that skips the provider entirely.

**Deferred, not built in the MVP:** AI-drafted activity descriptions for organizers (`POST /organizer/activities/draft-description`, human-in-the-loop, output lands in a textarea for the organizer to edit). It is small and genuinely useful, but one AI feature satisfies the requirement and two expands Phase 5 without adding capability. Phase 8.

**Never, in any phase:** the AI does not rank results, does not decide what a user sees, does not write to the database, does not moderate content, does not sit on the critical path of search, booking or payment, and does not act as a chat assistant.

---

## 15. Dashboards and MongoDB aggregation

Two dashboards, both backed by dedicated endpoints, **every figure produced by a MongoDB aggregation pipeline.** Nothing is counted in the browser, and nothing that MongoDB can compute is computed in Node.

### 15.1 Organizer dashboard

```
GET /api/v1/organizer/dashboard?from=2026-08-01&to=2026-09-13
    requireAuth + requireOrganizer          scoped to req.user._id at the first $match
```

`from` / `to` are optional ISO dates, coerced and range-checked by Zod (§21); they default to the last 30 days and are capped at a 365-day span. They apply to the trend series only — the headline counts are all-time.

**Response shape**

```json
{ "success": true, "data": {
  "activities":  { "total": 24, "draft": 3, "published": 12, "completed": 7, "cancelled": 2 },
  "bookings":    { "total": 318, "confirmed": 246, "cancelled": 31, "completed": 41, "seats": 402 },
  "capacity":    { "totalCapacity": 610, "totalSeatsBooked": 402, "utilizationPct": 65.9 },
  "rating":      { "avg": 4.31, "reviews": 88, "ratedActivities": 15 },
  "byCategory":  [ { "categorySlug": "pottery",  "activities": 6, "seats": 121 } ],
  "trend":       [ { "date": "2026-09-01", "bookings": 9, "seats": 12,
                     "confirmed": 8, "cancelled": 1 } ],
  "topActivities": [ { "activityId": "...", "title": "Sunday Beginner Badminton",
                       "seats": 58, "capacity": 60, "fillRatePct": 96.7,
                       "ratingAvg": 4.6, "ratingCount": 19 } ]
} }
```

**Pipeline A — activity counts, capacity, category mix and rating, in one round trip.**
`$facet` is the right tool here and the right thing to demonstrate: five independent aggregations, one query, one response.

```js
Activity.aggregate([
  { $match: { organizer: organizerId } },                    // ← scoping, always first
  { $facet: {

    byStatus: [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ],

    capacity: [
      { $match: { status: { $in: ['published', 'completed'] } } },
      { $group: { _id: null,
                  totalCapacity:    { $sum: '$capacity' },
                  totalSeatsBooked: { $sum: '$seatsBooked' } } },
      { $project: { _id: 0, totalCapacity: 1, totalSeatsBooked: 1,
          utilizationPct: {
            $cond: [ { $eq: ['$totalCapacity', 0] }, 0,
              { $round: [ { $multiply: [
                  { $divide: ['$totalSeatsBooked', '$totalCapacity'] }, 100 ] }, 1 ] } ] } } }
    ],

    byCategory: [
      { $match: { status: { $in: ['published', 'completed'] } } },
      { $group: { _id: '$categorySlug',                       // ← D3 pays off: no $lookup
                  activities: { $sum: 1 },
                  seats:      { $sum: '$seatsBooked' } } },
      { $sort:  { activities: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, categorySlug: '$_id', activities: 1, seats: 1 } }
    ],

    rating: [
      { $match: { ratingCount: { $gt: 0 } } },
      { $group: { _id: null,
                  weightedSum:     { $sum: { $multiply: ['$ratingAvg', '$ratingCount'] } },
                  reviews:         { $sum: '$ratingCount' },
                  ratedActivities: { $sum: 1 } } },
      { $project: { _id: 0, reviews: 1, ratedActivities: 1,
          avg: { $round: [ { $divide: ['$weightedSum', '$reviews'] }, 2 ] } } }
    ]
  }}
])
```

> **Why `rating.avg` is a weighted mean, not `$avg: '$ratingAvg'`.** Averaging the per-activity averages gives every activity equal weight regardless of how many reviews it has, so one activity with a single 5-star review counts as much as one with forty reviews averaging 3.9. Weighting by `ratingCount` and dividing by the total review count gives the true mean across all reviews. This is the single most common aggregation mistake in a dashboard of this shape, and getting it right is worth the extra two operators.

**Pipeline B — booking trend over time, with zero-days filled in MongoDB.**

```js
Booking.aggregate([
  { $match: { organizer: organizerId, createdAt: { $gte: from, $lte: to } } },
  { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt',
                              timezone: 'Asia/Kolkata' } },
      bookings:  { $sum: 1 },
      seats:     { $sum: '$quantity' },
      confirmed: { $sum: { $cond: [ { $eq: ['$status', 'confirmed'] }, 1, 0 ] } },
      cancelled: { $sum: { $cond: [ { $eq: ['$status', 'cancelled'] }, 1, 0 ] } } } },
  { $addFields: { date: { $dateFromString: { dateString: '$_id' } } } },
  { $densify: { field: 'date',
                range: { step: 1, unit: 'day', bounds: [from, to] } } },
  { $fill: { output: { bookings:  { value: 0 }, seats:     { value: 0 },
                       confirmed: { value: 0 }, cancelled: { value: 0 } } } },
  { $sort: { date: 1 } },
  { $project: { _id: 0, date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                bookings: 1, seats: 1, confirmed: 1, cancelled: 1 } }
])
```

`$group` returns no row for a day with no bookings, which renders as a chart with holes in it. `$densify` inserts the missing days and `$fill` gives them zeros — **in the database, not in a Node loop.** Both stages require MongoDB 5.1+, which every current Atlas tier satisfies. If the deployment target is ever older, the fallback is to fill the date axis in `stats.service.js`; that is a presentational concern and the only place in this design where leaving the database is acceptable.

**Pipeline C — top activities, the one place `$lookup` is genuinely necessary.**
Bookings must be grouped in the `bookings` collection, but the title, capacity and rating live on `activities`.

```js
Booking.aggregate([
  { $match: { organizer: organizerId, status: { $in: ['confirmed', 'completed'] } } },
  { $group: { _id: '$activity',
              bookings: { $sum: 1 },
              seats:    { $sum: '$quantity' } } },
  { $sort:  { seats: -1 } },
  { $limit: 5 },                                       // ← limit BEFORE the lookup
  { $lookup: {
      from: 'activities', localField: '_id', foreignField: '_id', as: 'activity',
      pipeline: [ { $project: { title: 1, capacity: 1, ratingAvg: 1, ratingCount: 1 } } ] } },
  { $unwind: '$activity' },
  { $project: { _id: 0, activityId: '$_id', bookings: 1, seats: 1,
      title:      '$activity.title',
      capacity:   '$activity.capacity',
      ratingAvg:  '$activity.ratingAvg',
      ratingCount:'$activity.ratingCount',
      fillRatePct: { $round: [ { $multiply: [
          { $divide: ['$seats', '$activity.capacity'] }, 100 ] }, 1 ] } } }
])
```

`$sort` + `$limit` run **before** `$lookup` so the join touches five documents rather than every activity the organizer owns. Ordering stages by cost is the difference between a dashboard that loads instantly and one that does not.

### 15.2 Admin dashboard

```
GET /api/v1/admin/dashboard        requireAuth + requireAdmin
```

The pending organizer-request queue is the **first widget**, because §7's gate means a growing queue is a growing set of people who want to supply activities and cannot.

```json
{ "users":   { "total": 412, "admins": 2,
               "organizerRequests": { "pending": 7, "approved": 31, "rejected": 4 } },
  "content": { "activities": 180, "published": 96, "bookings": 1204, "reviews": 388 },
  "signupTrend": [ { "date": "2026-09-01", "signups": 14 } ],
  "topCategories": [ { "categorySlug": "hiking", "activities": 22, "bookings": 310 } ] }
```

**Pipeline D — platform user statistics.**

```js
User.aggregate([ { $facet: {
  byOrganizerStatus: [ { $group: { _id: '$organizerStatus', count: { $sum: 1 } } } ],
  byRole:     [ { $group: { _id: '$role',           count: { $sum: 1 } } } ],
  organizers: [ { $match: { organizerStatus: 'approved' } }, { $count: 'count' } ],
  total:      [ { $count: 'count' } ],
  signupTrend:[ { $match: { createdAt: { $gte: from } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d',
                                                    date: '$createdAt' } },
                            signups: { $sum: 1 } } },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, date: '$_id', signups: 1 } } ]
}} ])
```

`$count` appears here as a distinct stage rather than `$group` + `$sum`, which is what it is for.

**Pipeline E — top categories across the platform**, joining bookings to activities and grouping by the denormalised slug.

```js
Booking.aggregate([
  { $match: { status: { $in: ['confirmed', 'completed'] } } },
  { $lookup: { from: 'activities', localField: 'activity', foreignField: '_id',
               as: 'a', pipeline: [ { $project: { categorySlug: 1 } } ] } },
  { $unwind: '$a' },
  { $group: { _id: '$a.categorySlug', bookings: { $sum: 1 },
              activities: { $addToSet: '$activity' } } },
  { $project: { _id: 0, categorySlug: '$_id', bookings: 1,
                activities: { $size: '$activities' } } },
  { $sort: { bookings: -1 } },
  { $limit: 10 }
])
```

### 15.3 Which statistic comes from which operator

| Statistic | Operators | Pipeline |
|---|---|---|
| Activities by status | `$match` `$facet` `$group` `$sum` | A |
| Total / confirmed / cancelled bookings | `$match` `$group` `$sum` `$cond` | B |
| Total seats booked | `$group` `$sum` | A, B |
| Capacity utilisation % | `$group` `$sum` `$project` `$divide` `$multiply` `$cond` `$round` | A |
| Average rating (weighted) | `$match` `$group` `$sum` `$multiply` `$divide` `$round` | A |
| Activities by category | `$group` `$sum` `$sort` `$limit` `$project` | A |
| Booking trend by day | `$match` `$group` `$dateToString` `$densify` `$fill` `$sort` | B |
| Top activities by seats | `$group` `$sort` `$limit` `$lookup` `$unwind` `$project` | C |
| Users by approval status / role | `$facet` `$group` `$count` | D |
| Signup trend | `$match` `$group` `$dateToString` `$sort` | D |
| Top categories platform-wide | `$lookup` `$unwind` `$group` `$addToSet` `$size` `$sort` `$limit` | E |
| Rating distribution on an activity | `$match` `$group` `$sort` | §9 |
| `ratingAvg` / `ratingCount` recompute | `$match` `$group` `$avg` `$sum` `$round` | §9 |

`$match` · `$facet` · `$group` · `$count` · `$sum` · `$avg` · `$lookup` · `$unwind` · `$sort` · `$limit` · `$project` · `$cond` · `$addToSet` · `$dateToString` · `$densify` · `$fill` — all present, all doing real work.

### 15.4 Authorization, correctness and performance

- **Scoping is the first stage, always.** `{ $match: { organizer: organizerId } }` precedes everything in every organizer pipeline. It is never applied after a `$group`, and the organizer id always comes from `req.user._id`, never from a query parameter. An organizer reading another organizer's numbers is a §26 test case, not a hope.
- Admin pipelines are guarded by `requireAdmin` at the router, not per route.
- **Indexes:** `{organizer, status, schedule.startDateTime}` serves Pipeline A's `$match`; `{organizer, createdAt}` — new in v4 — serves B and C; `{organizerStatus, organizerRequest.requestedAt}` serves D. Confirm with `.explain()` in Phase 4.
- **`$match` before `$lookup`, `$limit` before `$lookup`, `$project` before `$group`** on anything large. Ordering stages by selectivity is the whole performance story.
- **Caching:** dashboard responses are cached per caller for 60 seconds in an in-memory `Map` with TTL. Nobody needs a second-fresh KPI, and it turns the heaviest endpoint in the application into a cheap one. No Redis, no cache server.
- **Empty states are real states.** A brand-new organizer has zero of everything; `$facet` branches return empty arrays, not `null`, and the service normalises them to zeros so the dashboard renders numbers rather than crashing on `undefined`.

---

## 16. External integrations and server-to-server communication

Outly talks to four external services. **Every one of them is called from Express, never from React.** The browser holds no third-party credential of any kind, and the frontend's only outbound destination is the Outly API.

```
                          React SPA
                              │  (no external calls, no secrets)
                              ▼
                        Express API
                              │
                   services/external/
                   ┌──────────┴──────────┐
                   │  httpClient.js      │  one wrapper: timeout, bounded
                   │                     │  retry, key injection, error map
                   └──────────┬──────────┘
        ┌────────────┬────────┴───────┬──────────────┐
        ▼            ▼                ▼              ▼
   Cloudinary    Nodemailer        Twilio        AI provider
   (images)      (SMTP/API)        (SMS)         (explanations)
    Phase 4       Phase 1         Phase 6         Phase 5
```

This is the rubric's server-to-server requirement, and it is real rather than ceremonial: each call carries a secret that must not reach a browser, and each has a failure mode that must not take the application down.

**There is no internal service-to-service traffic.** Outly is one Express process. "Server-to-server" here means Express → a third party, which is the only form of it this architecture needs or should have.

### The shared client — `services/external/httpClient.js`

Every outbound call goes through one wrapper so that timeout, retry, logging and error shape are decided once rather than per integration.

| Concern | Policy |
|---|---|
| **Timeout** | `AbortController`, per-integration budget: AI 8 s, Twilio 10 s, email 10 s, Cloudinary 20 s (uploads are larger). A hung third party must never hold an Express worker open indefinitely. |
| **Retry** | At most **one** retry, and only on a network error or a 5xx. **Never** on a 4xx — a rejected request will be rejected again, and retrying a Twilio 400 is how a bug becomes a bill. Retries are skipped entirely for non-idempotent sends already dispatched. |
| **Credentials** | Read from the Zod-validated env object (§27), injected by the wrapper. No service module reads `process.env` directly, and no key is ever logged, echoed in an error, or returned in a response. |
| **Logging** | Method, host, status and duration. **Never** the request body, the response body, a key, a phone number or a message body. |
| **Error mapping** | Provider errors become `ApiError` with an internal code. A provider's raw message is logged and never forwarded to the client. |
| **Circuit sanity** | A per-provider failure counter; after five consecutive failures the integration is skipped for sixty seconds and the caller takes its documented fallback. Ten lines, no library, and it prevents a dead provider from adding eight seconds to every request. |

### The four integrations at a glance

| Service | Purpose | Phase | Credentials | Failure behaviour |
|---|---|---|---|---|
| **Cloudinary** | Activity image upload, transformation, CDN delivery | 4 | `CLOUDINARY_*` | Upload endpoint returns `503`; the organizer saves a draft and adds the image later. **No data loss.** |
| **Nodemailer** | Verification, password reset, approval/rejection, booking confirmation and cancellation, activity cancellation | 1 (transport) · 6 (notifications) | `SMTP_*` / `RESEND_API_KEY` | Logged and swallowed. **Never fails the action that triggered it.** |
| **Twilio** | Booking confirmation, booking cancellation, activity cancellation SMS | 6 | `TWILIO_*` | Logged and swallowed. **Never fails a booking.** (§17) |
| **AI provider** | Discovery explanations | 5 | `AI_*` | Templated explanations from the deterministic score components. (§14) |

### `services/external/ai.service.js`

The **only** module in the codebase that talks to a language model. One exported function in the MVP: `explainActivities(activities, context)`.

```
input    a bounded array (max 10) of { title, categorySlug, moods, level,
                                        energyLevel, mode, city, durationHours }
         plus { mood, time, budget }
         NO user id, name, email, phone, coordinates or history — by construction
call     POST {AI_BASE_URL}/chat/completions
         Authorization: Bearer {AI_API_KEY}        ← server-side only
         temperature 0 · max_tokens 300 · JSON-only response format
         timeout 8 s via the shared client
output   parsed, then Zod-validated:
           - every activityId must be in the set that was sent (hallucinated ids dropped)
           - reason trimmed, ≤ 200 chars, markup stripped
           - malformed response ⇒ discard entirely, fall back
guards   rate limit 10/min/user · AI_DAILY_CALL_CAP process-wide
         1-hour in-memory cache keyed on (sorted activityIds + context)
         AI_ENABLED=false is a hard kill switch
```

**Prompt-injection surface.** Activity titles and descriptions are written by organizers, which makes them untrusted input reaching a model. Three controls: only the title and a handful of enum fields are sent (never the free-text description); the system prompt states that activity text is data and not instruction; and the output is validated against the ids that were sent, so a model persuaded to do something else produces a response that fails validation and falls back. The model's output can never reach the database, trigger an action, or alter a ranking.

### `services/external/sms.service.js`

Wraps Twilio. One exported function: `sendSms(toE164, body)`. Substitutable by a console transport in development and by a mock in tests (§26). Detailed in §17.

### `services/external/email.service.js` and `upload.service.js`

Nodemailer and Cloudinary, unchanged from v3.1 in behaviour, relocated under `services/external/` in v4 so that every outbound integration sits behind one boundary with one policy.

### Environment variables added in v4

```bash
# AI
AI_ENABLED=false                 # hard kill switch; false ⇒ templated explanations only
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
AI_MAX_TOKENS=300
AI_TIMEOUT_MS=8000
AI_DAILY_CALL_CAP=500

# Twilio
SMS_ENABLED=false
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SMS_TIMEOUT_MS=10000
SMS_DAILY_CAP_PER_USER=10
```

All are parsed by the Zod env schema at boot (§27). `AI_ENABLED` and `SMS_ENABLED` default to `false`, so a missing credential produces a degraded-but-working application rather than a crash loop. **None of these has a `VITE_` prefix and none ever will** — Vite inlines `VITE_*` variables into the browser bundle.

---

## 17. Notifications — email and SMS

One service orchestrates; two transports deliver. `notification.service.js` decides *what* to send and to *whom*; `email.service.js` and `sms.service.js` know only how to send.

```
booking.service / activity.service / user.service
        │  (after the database write has committed)
        ▼
notification.service.notify(event, recipient, payload)
        ├─► email.service.send(...)     always attempted
        └─► sms.service.sendSms(...)    only if recipient.phone && recipient.smsOptIn
                                        && SMS_ENABLED
        ⚠ both wrapped — a transport failure NEVER propagates to the caller
```

### Triggers

| Event | Email | SMS | Recipient |
|---|---|---|---|
| Email verification | ✓ | — | the registering user |
| Password reset | ✓ | — | the requesting user |
| **Account approved** | ✓ | — | the user (§7) |
| **Account rejected** | ✓ (with reason) | — | the user (§7) |
| **Booking confirmed** | ✓ | **✓** | the booker |
| **Booking cancelled by the user** | ✓ | **✓** | the booker |
| **Activity cancelled by the organizer** | ✓ | **✓** | every confirmed attendee |
| New booking on your activity | ✓ | — | the organizer |
| Review posted on your activity | ✓ | — | the organizer |

SMS is used for exactly three events, and all three share one property: **the recipient is about to physically travel somewhere, or no longer should.** That is the only justification for a channel that costs money per message and interrupts a person's phone. Everything else is email.

### Phone numbers

`User.phone` is optional, stored in **E.164** (`+919876543210`), validated at the Zod layer with a strict pattern, and normalised before storage. `smsOptIn` defaults to `false`. **SMS is sent only when a phone is present, opt-in is true, and `SMS_ENABLED` is true** — three independent conditions, so a misconfiguration degrades to silence rather than to an error.

Phone *verification* (OTP) is deliberately deferred to Phase 8. An unverified number means a message may reach the wrong person, which is a reason to limit SMS to non-sensitive transactional content — a booking reference and an activity time — and never to include a link, a token, or anything that could be acted on by a stranger.

### The rule that matters most

> **A booking must never fail because an SMS provider is unavailable.**

Mechanically enforced by ordering and isolation:

```
1  atomic capacity reserve                 ← the transaction-critical part
2  Booking.create                          ← the transaction-critical part
3  respond 201 to the client               ← the user is done here
4  notification.service.notify(...)        ← fire-and-forget, after the response
       try { await email... } catch (e) { logger.warn(...) }      // swallowed
       try { await sms...   } catch (e) { logger.warn(...) }      // swallowed
```

Notifications are dispatched **after** the response is sent, each transport is individually wrapped, and neither can throw into the request path. The same rule governs email and applies identically to activity cancellation, where the database work happens inside a transaction (§11) and **all** notifications are sent after it commits — never inside it.

A failed send is logged with the event, the recipient id and the provider error. It is not retried beyond the shared client's single retry, and there is no dead-letter queue — that would be infrastructure this project has correctly avoided. A missed booking confirmation is visible to the user in My Bookings regardless; the SMS is a convenience, not the record.

### Rate limiting and cost control

`SMS_DAILY_CAP_PER_USER` (default 10) bounds per-user volume; exceeding it logs and skips. Activity cancellation fans out to every confirmed attendee, which is the only place a single action produces many messages — it is bounded by `capacity`, which is bounded at 10 000, and in practice by the tens. `SMS_ENABLED=false` disables the channel entirely.

**Twilio trial accounts can only send to verified numbers.** This is a property of the account, not the code. Demonstrate with a verified number and keep `SMS_ENABLED=false` in any environment where that is not arranged.

### Testing

`sms.service.js` exposes one function, which makes substitution trivial: a console transport in development, a mock in tests. Three test cases carry the design (§26): a successful send is attempted with the right number and body; **a throwing provider leaves the booking confirmed and returns 201**; and a user without `smsOptIn` is never sent anything. No test ever contacts Twilio.

---

## 18. Authentication and authorization

### Token strategy

- **JWT access token**, short-lived (15 min), held **in memory** on the frontend — never `localStorage`.
- **Refresh token**, 7 days, in an **httpOnly cookie**.
- **bcrypt** password hashing, cost 12.

**Token payloads carry `{ sub, tokenVersion }` and nothing else.** A JWT is signed, not encrypted — anything in the payload is readable by whoever holds it. In particular `role`, `organizerStatus` and `isEmailVerified` are **not** in the token: they are read from the database on every request, so verifying an email or approving an organizer request takes effect on the member's very next call rather than after a token refresh. Separate secrets for access and refresh tokens, so an access-secret leak cannot mint refresh tokens.

**Refresh-token rotation is deliberately deferred.** Rotation requires a stored hash and a database write on every refresh. Single-session `tokenVersion` revocation is sufficient for the MVP; rotation and replay detection are Phase 8 hardening, recorded rather than forgotten.

### `tokenVersion` — the complete and exhaustive policy

`tokenVersion` is a counter on the user, carried in both token payloads and compared on every request. Bumping it invalidates every token that account has been issued.

**It is bumped on exactly three events, and no others:**

| Event | Why |
|---|---|
| Logout | Ends the session; the refresh cookie alone is not enough, because the access token would otherwise remain valid for up to 15 minutes |
| Password reset | The account may have been compromised; every existing session must die |
| Password change | Same reasoning, initiated by the member |

**It is explicitly NOT bumped when an organizer request is rejected.** A rejected applicant is still a fully valid, verified member — they keep browsing, booking, cancelling and reviewing exactly as before. Only the request was refused, not the account. Ending their session would tell them, incorrectly, that they had been removed from the platform.

There is no account suspension or account rejection in this architecture, so no other event invalidates sessions. Do not add a fourth trigger without a corresponding account-lifecycle state to justify it.

### The five authorization primitives

```
requireAuth        valid access token · user exists · tokenVersion matches
                   → 401 UNAUTHENTICATED

requireVerified    isEmailVerified === true
                   → 403 EMAIL_NOT_VERIFIED

requireOrganizer   organizerStatus === 'approved'  ||  role === 'admin'
                   → 403 ORGANIZER_REQUIRED

requireAdmin       role === 'admin'
                   → 403 FORBIDDEN

requireOwnership   resource.organizer.equals(req.user._id) || role === 'admin'
                   → 403 NOT_OWNER  (404 where existence itself is private)
```

Composed per route, coarsest first. Each one answers exactly one question, and none subsumes another:

- `requireAuth` asks *who are you*.
- `requireVerified` asks *is this address real* — it is the platform's one proof that a member can be reached, which is what makes a booking record, a review byline and an organizer application meaningful.
- `requireOrganizer` asks *may you publish* — the capability, not the resource.
- `requireOwnership` asks *may you touch this one*. **`requireOrganizer` and `requireOwnership` are always applied together on owned resources.** The first says "an approved organizer may edit activities"; it does not say "this organizer may edit *this* activity." Conflating them produces an API where any organizer can edit anyone's activity.

`requireApproved` does not exist. There is no general admin approval of users.

### The authorization matrix

Six personas. **Every route guard in §19 and every test in §26 conforms to this table** — it is the single authoritative statement of who may do what.

| Capability | Unverified | Verified member | Pending applicant | Approved organizer | Rejected applicant | Admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Register, log in, refresh, logout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Verify email · resend verification | ✓ | n/a | n/a | n/a | n/a | n/a |
| Forgot / reset password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View and edit own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Browse · search · filter · sort · view details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| "I'm bored" discovery | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| AI explanations | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read reviews | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own bookings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Create a booking** | **—** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Cancel / manage own booking** | **—** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Submit a review** | **—** | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit / delete own review | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Request organizer capability** | **—** | ✓ | **—** ¹ | **—** ² | ✓ ³ | n/a |
| Create · edit · publish · cancel own activity | — | — | **—** | ✓ | **—** | ✓ |
| Upload activity image | — | — | — | ✓ | — | ✓ |
| Attendee list for own activity | — | — | — | ✓ | — | ✓ |
| Organizer dashboard | — | — | **—** | ✓ | **—** | ✓ |
| Reply to a review on own activity | — | — | — | ✓ | — | ✓ |
| Review organizer applications | — | — | — | — | — | ✓ |
| Approve / reject an organizer request | — | — | — | — | — | ✓ |
| Admin dashboard · hide a review | — | — | — | — | — | ✓ |

¹ `409 ORGANIZER_APPLICATION_PENDING` — a request is already open.
² `409 ALREADY_ORGANIZER` — already approved.
³ Only after the 30-day cooldown; otherwise `403 ORGANIZER_APPLICATION_REJECTED` with `details.canReapplyAt`.

**Read this table by column.** A pending applicant and a rejected applicant have **exactly the same rights as any verified member** — the organizer rows are the only difference. Applying and being refused costs a member nothing. That is the whole point of keeping organizer status separate from account standing.

### Guard composition per route class

| Route class | Guards |
|---|---|
| Browse, search, discovery, read reviews, categories | none (optional auth for personalisation) |
| Profile read/update, logout, own bookings list | `requireAuth` |
| AI explanations | `requireAuth` |
| **Create a booking** | **`requireAuth + requireVerified`** |
| **Cancel a booking** | **`requireAuth + requireVerified`** + ownership in the guarded status transition (§8) |
| **Submit, edit or delete a review** | **`requireAuth + requireVerified`** + eligibility (§9) / authorship |
| **Request organizer capability** | **`requireAuth + requireVerified`** |
| Read own organizer request status | `requireAuth` |
| **Create, edit, publish, cancel an activity · images · attendee list · reply to a review** | **`requireAuth + requireVerified + requireOrganizer + requireOwnership`** |
| Organizer dashboard | `requireAuth + requireVerified + requireOrganizer` (scoped at the first `$match`) |
| All `/admin/*` | `requireAuth + requireAdmin`, applied at the router |

Admin accounts are created by `scripts/createAdmin.js` with `isEmailVerified: true`, so admin routes need no separate verification guard.

### Email verification as an authorization boundary

**A verified email address is required before a member can create or manage a booking, submit a review, or request organizer capability.** This is the V5 rule and it is enforced server-side by `requireVerified` on every route in the table above.

Why these actions and not browsing: each one either commits a seat that someone else could have taken, attaches a public statement to a member's name, or asks an administrator to spend time on a review. All three need a reachable person behind them. Browsing commits nothing, so gating it would cost the product its first impression for no security gain.

The practical effect on the user journey:

```
Register → verify email → browse · discover · search → view details
        → BOOK → attend → activity completes → REVIEW
                                      └─ optionally: request organizer capability
```

An unverified member can still register, log in, browse, search, filter, sort, view any activity, run discovery, read reviews, manage their own account, and resend the verification email. What they see when they try to book is a clear prompt to verify, not a dead button (§22).

**Verification mechanics:** a random token is generated, only its SHA-256 hash is stored with a 24-hour expiry, and the raw token is emailed in a link. Redemption looks up by hash, sets `isEmailVerified: true`, and clears the token fields. Re-verifying an already-verified account is idempotent. Resending is rate-limited to 3 per hour per account.

### Password reset

Same token mechanism: random token, **store only the SHA-256 hash**, 1-hour expiry, single use, and **bump `tokenVersion`** on success so every existing session dies.

**`POST /auth/forgot-password` always returns `204`**, including for an email that does not exist. Returning `404` turns the endpoint into an account-enumeration oracle. For the same reason, login returns one generic `INVALID_CREDENTIALS` for both an unknown email and a wrong password, and runs the bcrypt compare even when the user is not found so the timing does not differ. Registration with an existing email returns a generic `EMAIL_IN_USE`.

### Rate limiting

| Scope | Limit |
|---|---|
| Global | 100 / 15 min per IP |
| `/auth/login`, `/auth/register` | 5 / 15 min per IP |
| `/auth/refresh` | 20 / 15 min per IP |
| `/auth/forgot-password` | 3 / hour per IP |
| `/auth/resend-verification` | 3 / hour per account |
| `POST /bookings` | 20 / 15 min per user |
| `POST /discover/explain` | 10 / min per user (§14) |
| `POST /reviews` | 10 / hour per user |
| `POST /organizer/request` | 5 / hour per IP — the 30-day cooldown (§7) is the real control; this only stops hammering |
| `/admin/*` | 300 / 15 min per admin |

`app.set('trust proxy', 1)` is required in production, or the rate limiter sees the platform proxy's IP for every request and throttles all users as one.

### Secrets — the complete rule

Cloudinary, Twilio, the AI provider, SMTP, both JWT secrets and the MongoDB URI exist **only** in the server's environment. They are read once through the Zod-validated env object, never logged, never included in an error response, and never given a `VITE_` prefix. The React bundle contains exactly one configuration value: `VITE_API_URL`. `.env` is in `.gitignore` from the first commit (§28).

### The frontend is never authoritative

Every rule in this section is enforced by server-side middleware. The frontend hides or disables what a member cannot do (§22) purely so they do not click something that will fail — **it is decoration, and it is assumed to be bypassable.** A direct API call from a terminal meets exactly the same guards as a click in the browser, and §26 tests that explicitly.

---

## 19. REST API contracts — `/api/v1`

**Envelope**

```json
{ "success": true,  "data": { }, "meta": { "page": 1, "limit": 12, "total": 84, "totalPages": 7 } }
{ "success": false, "error": { "code": "SOLD_OUT", "message": "...", "details": { } } }
```

**Auth column:** `—` public · `✓` authenticated · `✓ ver` authenticated **and email-verified** · `✓ org` verified **and** an approved organizer (or admin) · `✓ own` also ownership-checked · `✓ adm` admin only. Guards compose exactly as §18 specifies.

### Auth and account

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/health` | — | `{ status, uptime, db }` |
| POST | `/api/v1/auth/register` | — | account created unverified; sends verification email. Browsing works at once; booking does not (§18) |
| POST | `/api/v1/auth/login` | — | sets refresh cookie, returns access token |
| POST | `/api/v1/auth/refresh` | cookie | |
| POST | `/api/v1/auth/logout` | ✓ | clears cookie, bumps `tokenVersion` |
| GET | `/api/v1/auth/me` | ✓ | session bootstrap; returns `isEmailVerified` and `organizerStatus` so the UI can show the right prompts (§22) |
| POST | `/api/v1/auth/verify-email` | — | `{ token }` — idempotent if already verified |
| POST | `/api/v1/auth/resend-verification` | ✓ | rate-limited 3/hour per account |
| POST | `/api/v1/auth/forgot-password` | — | `{ email }` → **always 204** |
| POST | `/api/v1/auth/reset-password` | — | `{ token, password }` |
| PATCH | `/api/v1/users/me` | ✓ | name, avatar, city, interests, **phone**, **smsOptIn**. Never role or organizerStatus |

### Catalogue and discovery

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/categories` | — | `?mood=` optional |
| GET | `/api/v1/activities` | optional | `category` `mood` `mode` `level` `energy` `city` `q` `sort` `page` `limit` |
| GET | `/api/v1/activities/:id` | optional | adds `seatsRemaining`, `ratingAvg`, `ratingCount`; `isBooked` when authenticated |
| GET | `/api/v1/discover` | optional | `mood` `energy` `time` `budget` `city` `page` `limit` → deterministic ranked list |
| **POST** | **`/api/v1/discover/explain`** | **✓** | **AI explanations for up to 10 returned ids; falls back to templates (§14)** |

### Organizer

| Method | Route | Auth | Notes |
|---|---|---|---|
| **POST** | **`/api/v1/organizer/request`** | **✓ ver** | **`{ message, contactLink? }` — opens a pending request. Grants nothing (§7). `409 ALREADY_ORGANIZER` / `409 ORGANIZER_APPLICATION_PENDING` / `403 ORGANIZER_APPLICATION_REJECTED` as applicable** |
| **GET** | **`/api/v1/organizer/request`** | **✓** | **own request status, and the rejection reason if any** |
| POST | `/api/v1/organizer/activities` | ✓ org | creates `draft` |
| PUT | `/api/v1/organizer/activities/:id` | ✓ org + own | field-restricted once published (§11) |
| PATCH | `/api/v1/organizer/activities/:id/publish` | ✓ org + own | `draft → published`, sets `publishedAt` |
| DELETE | `/api/v1/organizer/activities/:id` | ✓ org + own | `→ cancelled` + cascade + notifications |
| POST | `/api/v1/organizer/activities/:id/images` | ✓ org + own | multipart → Cloudinary → `{ url, publicId }` |
| DELETE | `/api/v1/organizer/activities/:id/images/:publicId` | ✓ org + own | also deletes the Cloudinary asset |
| GET | `/api/v1/organizer/activities` | ✓ org | own activities, all statuses |
| GET | `/api/v1/organizer/activities/:id/bookings` | ✓ org + own | attendee list, paginated |
| **GET** | **`/api/v1/organizer/dashboard`** | **✓ org** | **`?from&to` → aggregated statistics (§15)** |

### Bookings

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/bookings` | **✓ ver** | `{ activityId, quantity }` — free activities only in MVP. **`403 EMAIL_NOT_VERIFIED` if unverified** |
| GET | `/api/v1/bookings/me` | ✓ | `?scope=upcoming\|past\|cancelled` |
| PATCH | `/api/v1/bookings/:id/cancel` | **✓ ver** + own | ownership **and** time checked in the guarded status transition (§8) |

### Reviews — **in the MVP**

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/activities/:id/reviews` | — | paginated, newest first, `isHidden` excluded |
| GET | `/api/v1/activities/:id/reviews/distribution` | — | 1–5 star counts, aggregation (§9) |
| GET | `/api/v1/organizers/:id/reviews` | — | aggregate rating + paginated list |
| POST | `/api/v1/reviews` | **✓ ver** | `{ activityId, rating, comment? }` — eligibility-gated (§9) |
| PATCH | `/api/v1/reviews/:id` | ✓ ver + own | within 7 days; sets `isEdited` |
| DELETE | `/api/v1/reviews/:id` | ✓ ver + own | author only; admins hide instead |
| POST | `/api/v1/reviews/:id/reply` | ✓ org + own | one organizer reply per review |

### Admin

| Method | Route | Auth | Notes |
|---|---|---|---|
| **GET** | **`/api/v1/admin/dashboard`** | **✓ adm** | **platform statistics (§15)** |
| **GET** | **`/api/v1/admin/organizer-requests`** | **✓ adm** | **`?status=pending\|approved\|rejected&q&page&limit` — the review queue** |
| GET | `/api/v1/admin/users` | ✓ adm | `?q&role&page&limit` — read-only directory |
| **PATCH** | **`/api/v1/admin/organizer-requests/:id/approve`** | **✓ adm** | **sets `organizerStatus: 'approved'`, emails the user** |
| **PATCH** | **`/api/v1/admin/organizer-requests/:id/reject`** | **✓ adm** | **`{ reason }` required; emails the user. Does **not** bump `tokenVersion` — the account stays fully usable** |
| PATCH | `/api/v1/admin/reviews/:id/hide` | ✓ adm | sets `isHidden`, never a hard delete |

**43 endpoints, all in the MVP.** Publish remains its own `PATCH .../publish` rather than being implied by `PUT` — nothing goes live as a side effect of an update, the same principle as the explicit organizer request and admin approval in §7.

---

## 20. Error code registry

Defined once, in `utils/errorCodes.js`, as a frozen constant. Codes are added to that file, never invented inline at a call site.

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Zod rejected the body, query or params; `details` is field-keyed |
| `INVALID_ID` | 400 | malformed ObjectId — never surface a raw `CastError` |
| `INVALID_CREDENTIALS` | 401 | wrong email **or** wrong password — deliberately indistinguishable |
| `UNAUTHENTICATED` | 401 | missing, expired, tampered, or `tokenVersion`-stale token |
| **`EMAIL_NOT_VERIFIED`** | **403** | **a verified email is required: booking, booking management, reviewing, or requesting organizer capability (§18)** |
| **`ORGANIZER_APPLICATION_PENDING`** | **409** | **an organizer request is already open for this account (§7)** |
| **`ORGANIZER_APPLICATION_REJECTED`** | **403** | **a previous request was rejected and the cooldown has not passed; `details.reason` and `details.canReapplyAt` are returned** |
| **`ALREADY_ORGANIZER`** | **409** | **an approved organizer requested organizer capability again** |
| `ORGANIZER_REQUIRED` | 403 | `organizerStatus !== 'approved'` — pending, rejected and `none` all land here |
| `NOT_OWNER` | 403 | authenticated, correct capability, wrong resource |
| **`CANNOT_SELF_MODERATE`** | **403** | **an admin attempted to approve or reject their own organizer request** |
| **`NOT_ATTENDED`** | **403** | **no `completed` booking for this user and activity (§9)** |
| `ACTIVITY_NOT_FOUND` | 404 | also returned instead of 403 for another organizer's draft |
| `EMAIL_IN_USE` | 409 | duplicate on register — including a previously rejected email |
| `SOLD_OUT` | 409 | capacity reached |
| `ACTIVITY_UNAVAILABLE` | 409 | not published, or cancelled |
| `ALREADY_BOOKED` | 409 | the partial unique index rejected the insert |
| **`ALREADY_REVIEWED`** | **409** | **the review unique index rejected the insert** |
| `CAPACITY_BELOW_BOOKED` | 409 | capacity edit below `seatsBooked` |
| `BOOKING_CLOSED` | 422 | start time has passed |
| `CANNOT_CANCEL` | 422 | already cancelled, or the activity has started |
| **`REVIEW_WINDOW_CLOSED`** | **422** | **edit attempted more than 7 days after creation** |
| `PAID_NOT_SUPPORTED` | 422 | `price > 0` before Phase 7 |
| `RATE_LIMITED` | 429 | |
| `INTERNAL` | 500 | generic message to the client, full detail to the logs only |

**25 codes, all in the MVP.** Each one is raised by a route in §19 and asserted by a test in §26; none exists without both.

There is deliberately **no error code for an AI or SMS failure.** Neither is a client-visible error: the AI path returns `source: "template"` with a `200`, and SMS failure is invisible to the request that triggered it. A third-party outage is not a user's problem to read about.

The frontend maps codes to user-facing copy in one place — and **that copy belongs to the UI/UX track, not to this document** (§3). Messages from the server are for developers; the client decides what a person reads.

---

## 21. Validation rules

**Zod, one library, both ends.** A generic `validate(schema, source)` middleware parses `req.body`, `req.query` or `req.params`, **replaces** `req[source]` with the parsed result, and throws `VALIDATION_FAILED` with field-keyed details on failure.

**Replacing rather than merging is the point.** It is what strips unknown keys — which is how `role: 'admin'`, `organizerStatus: 'approved'`, `status: 'published'` or `ratingAvg: 5` in a request body gets dropped before it can reach the database. Mass assignment is closed by the shape of the middleware, not by remembering to check.

### Rules the server enforces regardless of what the client sends

- All routes under `/api/v1`.
- **Never accept `price` or `totalPrice` from the client as authoritative.** `price` must be `0` in MVP; non-zero at creation is `PAID_NOT_SUPPORTED`.
- `quantity` is an integer, `1 ≤ quantity ≤ 4`.
- Only `published` activities with a future `startDateTime` can be booked — enforced inside the atomic filter, not by a preceding read.
- Only `confirmed` bookings consume seats. Capacity changes are a single atomic operation.
- Cancellation requires ownership **and** a time check.
- Organizer write routes require `requireOrganizer` **and** `requireOwnership` — both, always.
- **Booking, booking management, reviewing and the organizer request require a verified email (`requireVerified`, §18). None of them is gated by admin approval.**
- **Publishing an activity requires `organizerStatus === 'approved'`, which only the admin endpoints in §19 can set.**
- **`organizerStatus`, `role`, `tokenVersion` are settable only by the admin endpoints in §19 — never through `PATCH /users/me`.**
- **`energyLevel` is one of `low`/`medium`/`high`, default `medium`. `moods` holds 1–3 values from the five `Category.mood` enums; the server always seeds it with the category's own mood and rejects a body that omits or contradicts it. Neither field may be set to a value outside its enum.**
- **`organizerRequest.message` is 30–500 characters; `contactLink` must be an `https://` URL when present.**
- **`rating` is an integer 1–5; `comment` is 10–1000 characters when present; `ratingAvg` and `ratingCount` are never accepted from a body.**
- **`phone` must match E.164 (`^\+[1-9]\d{7,14}$`) and is normalised before storage; `smsOptIn` is a boolean and is meaningless without a phone.**
- `mode === 'offline'` ⇒ `location.address`, `location.city`, `location.geo.coordinates` required. `mode === 'online'` ⇒ `location` omitted.
- `endDateTime > startDateTime`; `startDateTime` is in the future at creation.
- `categorySlug` is derived server-side from `category`, never accepted from a body.
- Never expose `passwordHash` or token hashes — `select: false` at the schema, not per query.
- Internal errors are logged, never returned. One generic `INTERNAL` message in production.

### Query and AI-payload validation

```
page    coerce → integer ≥ 1, default 1
limit   coerce → integer 1–50, default 12          ← uncapped limit is a free DoS
sort    enum ['soonest','newest','popular','rating'], default 'soonest'
city    trimmed string, max 60
q       trimmed string, max 100
mood    enum ['move','create','learn','socialise','outdoors']   ← matched against moods[]
energy  enum ['low','medium','high']
mode    enum ['online','offline']
level   enum ['beginner','intermediate','advanced']
from/to coerce → date; to ≥ from; span ≤ 365 days  ← dashboard window (§15)
status  enum ['pending','approved','rejected']      ← admin organizer-request filter (§19)

POST /discover/explain
  activityIds  array of ObjectId, 1–10, unique
  context      { mood, time, budget } — all enums

AI RESPONSE (inbound, validated before use — §14)
  array of { activityId ∈ the ids that were sent, reason: string ≤ 200 }
  anything else ⇒ discard the whole response, fall back to templates
```

Coercion means the service layer receives numbers and dates, never strings. `express-mongo-sanitize` is the second layer, stripping `$` and `.` so `?sort[$where]=` and `?price[$gt]=` cannot reach a query.

**Validating a third party's response is the same discipline as validating a client's request.** The AI provider is untrusted input; §14 treats it that way.

---

## 22. Frontend architecture, React hooks, and the UI framework

### The UI framework decision

**Tailwind CSS is Outly's UI framework and styling solution.** Utility classes plus a small set of hand-written primitives in `shared/components/` — `Button`, `Input`, `Modal`, `Spinner`, `EmptyState`, `ErrorState`, `Pagination`, `ConfirmDialog`.

**No second UI library is added.** Not Bootstrap, not Material UI, not a component kit. Mixing Tailwind with a component library that ships its own design system produces two competing sources of truth for spacing, colour and typography, and doubles the bundle for components this project writes in twenty lines each. If a rubric names a specific framework, the correct response is to note that Tailwind is the chosen one and that it satisfies "a UI framework" — **not** to install a second one alongside it.

Visual design — tokens, scale, palette, iconography — belongs to the UI/UX track (§3), not to this document. Tailwind is the mechanism; the design system is somebody's deliberate work, not a default.

### Structure

```
client/src/
├── app/          App.jsx · router.jsx · providers.jsx
├── features/     auth · activities · booking · organizer · profile
│                 categories · discover · reviews · admin
├── shared/
│   ├── components/   the primitives above
│   ├── lib/          axiosClient.js · queryClient.js · queryKeys.js
│   │                 errorMessages.js · validators/
│   ├── hooks/        the custom hooks below
│   └── utils/
└── main.jsx
```

Two feature folders are new in v4: `reviews/` and `admin/`. Notifications, social and chat remain later modules and are **not** scaffolded — an empty folder is a promise the project has not made.

### React hook architecture

Every server interaction goes through a custom hook. **No component calls `axios` directly, and no component writes a query key by hand.** Hooks are the seam between React and the API: they own the key, the fetcher, the cache policy and the invalidation, so a change to an endpoint touches one file.

| Hook | Type | Endpoint | Notes |
|---|---|---|---|
| `useAuth()` | context | — | `{ user, isBootstrapping, login, logout, register }` from `AuthContext` |
| `useCurrentUser()` | `useQuery` | `GET /auth/me` | the session bootstrap; `staleTime: Infinity`, invalidated on login/logout |
| `useActivities(filters)` | `useQuery` | `GET /activities` | `filters` comes from `useSearchParams`, so the key *is* the URL |
| `useActivity(id)` | `useQuery` | `GET /activities/:id` | prefetched on card hover |
| `useRecommendations(ctx)` | `useQuery` | `GET /discover` | deterministic results — renders immediately |
| `useExplanations(ids, ctx)` | `useQuery` | `POST /discover/explain` | **`enabled: ids.length > 0`**, `retry: false`, separate key so a failure never touches the results cache (§14) |
| `useBookings(scope)` | `useQuery` | `GET /bookings/me` | |
| `useCreateBooking()` | `useMutation` | `POST /bookings` | **never optimistic** — the server's atomic decision is the answer. Invalidates `['activities','detail',id]` and `['bookings','me']` |
| `useCancelBooking()` | `useMutation` | `PATCH /bookings/:id/cancel` | same invalidations |
| `useReviews(activityId)` | `useQuery` | `GET /activities/:id/reviews` | paginated |
| `useCreateReview()` | `useMutation` | `POST /reviews` | invalidates the review list **and** `['activities','detail',id]`, because `ratingAvg` changed |
| `useOrganizerDashboard(range)` | `useQuery` | `GET /organizer/dashboard` | `staleTime: 60_000`, matching the server-side cache (§15) |
| `useOrganizerActivities(status)` | `useQuery` | `GET /organizer/activities` | |
| `useOrganizerRequests(filters)` | `useQuery` | `GET /admin/organizer-requests` | the admin review queue |
| `useAdminUsers(filters)` | `useQuery` | `GET /admin/users` | read-only directory |
| `useApproveOrganizer()` / `useRejectOrganizer()` | `useMutation` | `PATCH /admin/organizer-requests/:id/…` | invalidate `['admin','organizerRequests']` and `['admin','dashboard']` |
| `useAdminDashboard()` | `useQuery` | `GET /admin/dashboard` | |
| `useUploadImage()` | `useMutation` | `POST /organizer/activities/:id/images` | multipart, with progress |

Plus three that touch no endpoint: `useDebounce(value, ms)` for the search box, `useSearchParamsState()` wrapping filter state in the URL, and `useMediaQuery()` for layout.

**Built-in hooks** are used conventionally: `useState` and `useReducer` for local UI, `useEffect` strictly for synchronisation with outside systems (never for fetching — TanStack Query does that), `useContext` for `AuthContext`, `useMemo` and `useCallback` only where a measured render cost justifies them, `useRef` for DOM handles and for the axios refresh single-flight flag.

**Hooks are not created to satisfy a checklist.** Each one above wraps exactly one endpoint that a real screen calls; none exists without a caller.

### Query keys

One `queryKeys.js` factory. Without a convention, every feature invents its own keys and invalidation becomes guesswork.

```
['auth','me']
['activities']                              // broad invalidate
['activities','list', filters]
['activities','detail', id]
['activities','detail', id, 'reviews']
['discover', { mood, time, budget, city, page }]
['discover','explain', sortedIds]
['categories']
['bookings','me', scope]
['organizer','activities', status]
['organizer','activities', id, 'bookings']
['organizer','dashboard', range]
['admin','users', filters]
['admin','dashboard']
```

**Filter state lives in the URL** via `useSearchParams`, not in component state — discovery results become shareable and bookmarkable, the back button behaves, and the cache key derives from the URL. The URL is the single source of truth; no component holds a second copy.

`queryClient` defaults: `staleTime: 60_000` · `gcTime: 5 min` · `retry: 1` · `refetchOnWindowFocus: false` · **never** retry a 4xx.

### Auth bootstrap and the axios client

```
1  App boot → AuthContext.isBootstrapping = true
2  GET /auth/me with withCredentials
3  THE ROUTER RENDERS NOTHING PROTECTED UNTIL isBootstrapping === false
   Skipping this makes every page refresh flash a redirect to /login.
4  Request interceptor  → attaches Authorization: Bearer <token>
5  Response interceptor → on 401: call /auth/refresh ONCE, queue concurrent
   failures, retry them with the new token; on refresh failure clear state
   and redirect. Guard with a _retry flag against infinite loops.
```

**Cross-site cookie requirements** (Vercel frontend, Render/Railway backend): `httpOnly; Secure; SameSite=None; Path=/api/v1/auth`, server CORS `credentials: true` with an explicit origin allowlist (`origin: '*'` is invalid with credentials and browsers reject it outright), and `withCredentials: true` on the client. **All of this works on localhost and silently fails in production**, which is why deployment is Phase 1.

### Verification- and organizer-status-aware UI

`useCurrentUser()` returns `isEmailVerified` and `organizerStatus`, which drive two things and nothing else.

**Verification.** While `isEmailVerified` is false, the Book, Review and Become-an-organizer controls render as a prompt — "Verify your email to book", with a resend link — rather than as a dead button or a hidden one. Browsing, search, discovery and activity details are untouched. A verification banner sits in the app shell with a one-click resend, and clears the moment `['auth','me']` is invalidated after verification.

**Organizer status.** `none` shows "Become an organizer"; `pending` shows "Request under review"; `rejected` shows the reason and, once the cooldown has passed, a re-apply option; `approved` reveals the organizer workspace. **Booking and reviewing are never disabled for *approval* reasons** — a verified member has full access whatever their organizer standing. The API enforces every one of these rules independently (§18). **The frontend check is UX and is assumed bypassable; the backend check is the boundary.**

### Four states, always

Loading (skeletons matching the final layout) · empty (with a next action) · error (with a retry wired to `refetch`) · success. `EmptyState` and `ErrorState` exist from Phase 0 so no component improvises one. **Never optimistically update a booking.**

---

## 23. Backend modules

```
server/src/
├── config/
│   ├── env.js              # Zod-validated environment, frozen export
│   ├── db.js               # mongoose connect, retry, listeners, fail-fast
│   └── logger.js           # pino
│
├── models/       User.js · Category.js · Activity.js · Booking.js · Review.js
│
├── routes/       auth · users · categories · activities · discover
│                 organizer · bookings · reviews · admin · health
│
├── controllers/  thin HTTP adapters — 3–8 lines each
│
├── services/
│   ├── auth.service.js
│   ├── user.service.js             # profile, approval transitions
│   ├── activity.service.js
│   ├── booking.service.js          # atomic capacity logic lives here
│   ├── organizer.service.js        # organizer request/status + ownership
│   ├── review.service.js           # eligibility gate + rating recompute
│   ├── discovery.service.js        # filter building for GET /activities
│   ├── recommendation.service.js   # deterministic "I'm bored" scoring
│   ├── stats.service.js            # ALL dashboard aggregation pipelines
│   ├── notification.service.js     # fan-out: decides what and to whom
│   └── external/
│       ├── httpClient.js           # timeout · bounded retry · key injection
│       ├── ai.service.js           # the ONLY module that calls an LLM
│       ├── sms.service.js          # Twilio
│       ├── email.service.js        # Nodemailer
│       └── upload.service.js       # Cloudinary
│
├── middleware/
│   ├── auth.js             # requireAuth, optionalAuth
│   ├── authorize.js        # requireVerified · requireOrganizer
│   │                       #   requireAdmin · requireOwnership   (§18)
│   ├── validate.js         # validate(schema, source)
│   ├── upload.js           # multer memoryStorage + fileFilter
│   ├── rateLimit.js
│   ├── notFound.js
│   └── error.js            # the single terminal handler
│
├── validators/   zod schemas, one file per resource, bodies AND queries
├── jobs/         completion.job.js          # the only scheduled task
├── utils/        ApiError · ApiResponse · asyncHandler · errorCodes
│                 geo · slugify · bookingRef · pagination · cache (in-memory TTL)
├── templates/emails/
├── app.js        # builds and EXPORTS the app — never calls listen()
└── server.js     # connects, starts jobs, listens
```

`scripts/`: `seed.js` · `reconcile.js` · `createAdmin.js` · `migrateApprovals.js`.

**New in v4:** `Review.js`, `review.service.js`, `stats.service.js`, `notification.service.js`, the `external/` folder with its shared client, `requireVerified`, `utils/cache.js`, and the reviews and admin routers.

### The `app.js` / `server.js` split

`app.js` exports the assembled Express app and **never** calls `listen()`. `server.js` imports it, connects the database, registers jobs, and listens. Supertest imports `app` directly and runs it without binding a port; if `listen()` lives in `app.js`, every test run leaks a port and the suite becomes flaky.

### Controller vs service

| | Controller | Service |
|---|---|---|
| Knows about | `req`, `res`, status codes, cookies | domain concepts only |
| Does | reads validated input, calls one service function, shapes the response | all rules, all database access, all orchestration |
| Never | contains a Mongoose query or a business `if` | touches `req`/`res` or imports Express |

A controller longer than ten lines is holding logic that belongs in a service. **Every aggregation pipeline in §15 lives in `stats.service.js`, never in a controller.**

### Middleware order

```
helmet → cors(allowlist, credentials) → express.json({limit:'10kb'})
→ cookieParser → mongoSanitize → compression → pino-http → rateLimit
→ routes
   per-route: requireAuth → requireVerified → requireOrganizer
            → validate → requireOwnership → controller        (§18)
→ notFound → error
```

`validate` runs after the coarse guards (no point validating a request that will be rejected) and before ownership (no point loading a document for a malformed id).

### Error handling and configuration

One `ApiError(statusCode, code, message, details?)`. All async controllers wrapped in `asyncHandler`. One terminal handler translating Mongoose `ValidationError` → 400, `CastError` → `INVALID_ID`, `E11000` → 409 naming the duplicated field, JWT errors → 401, Multer `LIMIT_FILE_SIZE` → 400; logging everything with a request id; returning the real message for operational errors and a generic one otherwise.

`config/env.js` parses `process.env` through a Zod schema **at startup** and exports a frozen object. **Nothing else in the codebase reads `process.env` directly** — including the AI and Twilio services, which receive their credentials from the env object through the shared client.

---

## 24. Development phases

The v3 phase order is preserved. What changed is the **content** of Phases 1, 4, 5 and 6, each of which absorbed a rubric requirement, and the MVP boundary, which now sits after a Phase 6 that contains everything required.

| # | Build | Days | Depends on | Definition of done |
|---|---|---|---|---|
| **0** | **Foundation & contract lock** — repo, env schema, DB connection, API skeleton, React shell, Tailwind, shared primitives, test runner, **every cross-cutting contract decided** (§29) | 2 | — | Health endpoint returns live DB status in the browser; **no architectural decision remains open** |
| **1** | **Auth · email verification · profile · organizer approval · FIRST DEPLOY** — register/login/refresh/logout, **email verification end to end plus the `requireVerified` guard**, forgot & reset, `PATCH /users/me` (interests, city, phone, smsOptIn), **`organizerStatus` + the organizer-request flow + admin approve/reject + a minimal admin review-queue screen**, Nodemailer via Mailtrap, protected routes, boot gate | 4 | 0 | Full auth cycle works **in production**, surviving a hard refresh, in an incognito window; **an unverified account can browse but is refused by `requireVerified` with `403 EMAIL_NOT_VERIFIED`; verifying then retrying succeeds with no re-login**; an admin can approve an organizer request and that member's publishing access changes on the next request |
| **2** | **Categories · activity read · search/filter/sort/pagination · seed** — Category model + mood taxonomy, activity read APIs, the full query contract, detail page, **seed script**, indexes verified with `.explain()` | 4 | 1 | A filtered, sorted, paginated URL reproduces identically in another browser; no `COLLSCAN` on the feed |
| **3** | **Booking · atomic capacity · integrity · completion job** — reserve/compensate write path, guarded cancellation behind `requireVerified`, `bookingReference`, My Bookings, `npm run reconcile`, **concurrency test suite**, and **the completion job that writes `completed`/`completedAt`** | 5 | 2 | 20 concurrent requests for 1 seat → exactly one 201, nineteen 409s, `seatsBooked === 1` — run 10×; an unverified account is refused with `403 EMAIL_NOT_VERIFIED`; the completion job is idempotent |
| **4** | **Organizer · Cloudinary · dashboards · aggregation** — activity create/edit/publish/cancel with cascade, image upload, attendee list, **organizer dashboard and admin dashboard with all six aggregation pipelines (§15)** | 6 | 1, 3 | Create → publish → book → attendee list → cancel → attendee bookings cancelled; both dashboards render real aggregated numbers, and an organizer provably cannot see another organizer's figures |
| **5** | **"I'm bored" discovery · AI refinement** — mood/time/budget wizard, deterministic scoring pipeline, **`ai.service.js`, `POST /discover/explain`, output validation, templated fallback, caching, rate limits** | 5 | 2, 3 | Two users with different interests get visibly different rankings; explanations appear after results; **with `AI_ENABLED=false` the feature still returns templated explanations and nothing else changes** |
| **6** | **Notifications · Twilio SMS · Reviews** — email notifications, **`sms.service.js` on three triggers**, and **`Review` end to end: model, eligibility gate behind `requireVerified`, rating recompute, organizer reply, admin hide** | 5 | 1, 3, 4 | Booking sends an email and an SMS; **a verified attendee whose booking reached `completed` can review once and the activity's `ratingAvg` provably matches its reviews**; an unverified account is refused; a throwing SMS provider leaves the booking confirmed |
| — | **— MVP BOUNDARY — everything the rubric requires is now shipped —** | | | |
| **H** | **Hardening** — complete the suite, CI green, `npm audit`, `.explain()` re-verified with dashboard pipelines, accessibility and responsive passes, README, final deploy, manual E2E | 4 | all | A stranger can clone, follow the README, and run it locally in under ten minutes |
| **7** | Razorpay/Stripe, real payment state machine, `price > 0` unlocked | — | 3, 6 | *deferred* |
| **8** | `$geoNear` + map UI · refresh-token rotation · phone (OTP) verification · AI description drafting · review moderation queue · analytics · Socket.IO **only if** a concrete requirement appears | — | 2, 6 | *deferred* |

**Sizing, not a schedule.** The day figures are relative effort estimates for one developer — they exist so you can tell when a phase is ballooning, not as commitments. **This project has no fixed deadline: every phase closes when its definition of done passes, not when a date arrives.** The MVP boundary is about 31 days of effort plus 4 for hardening; treat a phase that runs 50% over its estimate as a signal to look at what grew, not as a reason to cut corners. Unchanged by v5: the completion job's half-day moved between phases rather than being added. At six working days a week, roughly six weeks.

### Two ordering decisions inside the phases

**The completion job belongs in Phase 3, not Phase 6.** Review eligibility is expressed as `booking.status === 'completed'`, and nothing sets that status until the completion job exists. v4.1 placed both in Phase 6, which created an intra-phase dependency in the final phase of the project — the worst possible place for one. Moving the job into Phase 3 finishes the booking lifecycle end to end in a single phase, gives Phase 3's integrity suite a completed-booking fixture to assert against, and leaves Phase 6 with three independent pieces. The half-day moves with it; the total is unchanged.

**Email verification belongs in Phase 1.** `requireVerified` guards booking (Phase 3), reviewing (Phase 6) and the organizer request (Phase 1), so it must exist before any of them. Building it in Phase 1 alongside the email transport it depends on means every later phase's tests and UI can assume it.

**The seed script must produce completed activities and completed bookings** (§26), or Review is unreachable in development and undemonstrable in a review — nobody wants to wait for an activity's `endDateTime` to pass to test a rating.

### Three ordering decisions, restated

**Deployment at the end of Phase 1, not the end of the project.** Cross-site refresh cookies, CORS with credentials, SPA rewrites and build-time env inlining fail *only* in production. Finding that in week two costs a day; finding it in week six costs the submission.

**Booking (3) before organizer writes (4).** This front-loads the single hard problem, and it is why Phase 2 must ship a seed script — Phase 3 books against seeded activities.

**Phase 2 is read-side only.** Activity writes belong with the organizer experience in Phase 4.

### Scope is fixed; time is not

Every phase carries a rubric requirement, so **nothing can be dropped** — the 26 Must-Haves in §33 are the scope, and they do not grow either. With no deadline, that is a comfortable position rather than a tight one: quality is the variable, and it varies upward.

**The guard rail runs the other way now.** Having time is not a reason to pull payments, maps or chat forward from Phases 7–8. Those were deferred on merit, not on schedule, and adding them would dilute the two things that actually make Outly good — discovery quality and registration integrity — while adding surface to build, test and demonstrate. Extra time belongs in depth, not breadth.

### The UI/UX track — now actually scheduled

§3 defines UI/UX design as a parallel, non-blocking deliverable, and no earlier revision gave it a slot. It gets one here, because with no deadline it is the single largest quality lever available.

**Run it alongside Phases 2–4**, once there are real screens to design and real data to fill them:

- **During Phase 2** — information architecture and navigation, the activity card, the discovery results layout, the filter surface, and the four states every data view owes (§22).
- **During Phase 3** — the booking flow end to end, including the states that exist only because of the capacity design: full, closed, already booked, cancelled, plus the verification prompt (§18).
- **During Phase 4** — the dashboard: which numbers lead, how a chart reads at a glance, what an organizer with zero activities sees.

Output is `docs/UX.md` plus a small token set Tailwind is configured from. It gates nothing — if it slips, implementation continues against the existing primitives — but done alongside, it is the difference between a project that works and one people react to.

---

## 25. MVP boundary

**The MVP closes after Phase 6 (plus hardening). Every rubric Must-Have is inside it.**

### The final user lifecycle

```
Register → Verify email → Browse / Discover → Search · Filter · Sort
        → View activity details → Book → Attend → Activity completes → Review
                                                         │
                              optionally, at any point after verification:
                              Request organizer capability → admin review
                              → approved → publish activities
```

**Email verification sits between registering and booking.** Everything to the left of it is open; everything from Book onward requires it (§18).

### The final user lifecycle

```
Register → Verify email → Browse / Discover → Search · Filter · Sort
        → View activity details → Book → Attend → Activity completes → Review
                                                         │
                              optionally, at any point after verification:
                              Request organizer capability → admin review
                              → approved → publish activities
```

**Email verification sits between registering and booking.** Everything to the left of it is open; everything from Book onward requires it (§18).

### In scope — implemented before the MVP closes

**Five models:** `User` · `Category` · `Activity` · `Booking` · `Review`.

| Capability | Where |
|---|---|
| Authentication — register, login, refresh, logout, **email verification as an authorization boundary**, **forgot/reset password** | §18, Phase 1 |
| Authorization — two roles, organizer capability, verification gate, ownership checks, six-persona matrix | §7, §18 |
| **Admin approval of users** — organizer requests: `none`/`pending`/`approved`/`rejected`, approve and reject endpoints | §7, Phase 1 |
| Client- and server-side validation | §21, every phase |
| **Email** — verification, reset, approval, rejection, booking confirmation and cancellation | §17, Phases 1 & 6 |
| Routing — React Router, protected and role-aware routes | §22 |
| **Dashboard with statistics** — organizer and admin | §15, Phase 4 |
| **MongoDB aggregation** — sixteen operators across six pipelines | §15 |
| Search, sort, pagination, query parameters | §14, §21, Phase 2 |
| **File upload + cloud storage** — Cloudinary | §16, Phase 4 |
| **Server-to-server communication** — Cloudinary, Nodemailer, Twilio, AI provider | §16 |
| **AI integration** — discovery explanations with validated output and a working fallback | §14, Phase 5 |
| **Twilio SMS** — booking confirmed, booking cancelled, activity cancelled | §17, Phase 6 |
| **React hooks** — seventeen custom hooks over the query layer | §22 |
| **UI framework** — Tailwind | §22 |
| **Reviews and ratings** with rating aggregation | §9, Phase 6 |
| Booking with atomic capacity, duplicate prevention, cancellation | §8, Phase 3 |
| **Data-integrity testing** — concurrency, capacity, rollback, reconciliation | §26, Phase 3 |
| Geospatial storage — GeoJSON + `2dsphere` | §12 |
| "I'm bored" deterministic discovery | §14, Phase 5 |
| **Deployment** — live from the end of Phase 1 | §27 |
| **GitHub workflow** | §28 |

### Out of scope — deferred, with nothing the rubric needs among them

- **Paid activities** (`price > 0`) and any payment gateway — Phase 7. `unitPrice`, `totalPrice` and `paymentStatus` remain as seams.
- **Radius / "near me" search and map UI** — geometry is stored correctly; the query and the map are Phase 8.
- **Recurring or templated activities** — a documented future evolution.
- **Refresh-token rotation** — `tokenVersion` revocation is sufficient for MVP.
- **Phone (OTP) verification** — SMS content is limited accordingly (§17).
- **AI-drafted activity descriptions** — one AI feature satisfies the requirement; a second adds scope, not capability.
- **Review moderation queue** — admins can hide a review; a dedicated queue is Phase 8.
- **Social graph, friends, chat, real-time, in-app notifications beyond email and SMS.**
- **ML model training** — a third-party AI API satisfies the requirement; training a model does not serve any user need here.
- **Multi-currency** — INR only.

### Deliberate seams — cost nothing now, make later phases additive

`unitPrice` · `totalPrice` · `paymentStatus` · GeoJSON geometry and the `2dsphere` index · the `budget` parameter in discovery · `/api/v1` in every path.

**`ratingAvg` and `ratingCount` are no longer seams.** They are live, maintained by `review.service.js`, read by the dashboard and by `sort=rating`, and governed by invariant I4.

---

## 26. Testing

**Around 55 tests, concentrated where a bug is expensive.** Coverage percentage is a poor target for a solo build; concurrency, authorization, aggregation correctness and third-party failure are excellent ones.

| Layer | Tool |
|---|---|
| Runner | **Vitest** — fast, ESM-native, same runner both sides |
| API | **Supertest** — drives the exported app in-process, no ports |
| Database | **mongodb-memory-server** — real MongoDB, fresh per suite. Mocking Mongoose tests the mock, not the query |
| External services | **Hand-written mocks** at the `services/external/*` boundary. No test ever contacts Twilio, an AI provider, Cloudinary or an SMTP server |

### By phase

**Phase 1 — auth and approval (~12)**

*Auth:* duplicate email → 409 · weak password → 400 · identical error and comparable timing for unknown-email vs wrong-password · expired and tampered tokens → 401 · **forgot-password returns 204 for an unknown email** · reset token is single-use and bumps `tokenVersion`, invalidating old access tokens · email verification marks the account and is idempotent.

*Email verification — the §18 boundary.* An unverified account **can** register, log in, browse, search, filter, sort, open an activity, run discovery and read reviews · an unverified account **cannot** book → `403 EMAIL_NOT_VERIFIED` · cannot cancel a booking → 403 · cannot submit a review → 403 · cannot request organizer capability → 403 · **verifying then retrying the same request succeeds with no re-login**, because `isEmailVerified` is read per request and is not in the token · resend is rate-limited to 3/hour · verifying twice is idempotent · an expired verification token → 400.

*Organizer approval:* a newly registered user has `organizerStatus: 'none'` · **a verified account can book and review immediately — no admin approval anywhere in that path** *(the standing regression test: if this fails, the approval gate has crept back onto ordinary members)* · a valid request sets `pending` and **grants nothing** — the same user's `POST /activities` still returns `403 ORGANIZER_REQUIRED` · **a pending applicant can still book, cancel and review** · requesting twice → `409 ORGANIZER_APPLICATION_PENDING` · an approved organizer requesting again → `409 ALREADY_ORGANIZER` · approve flips to `approved` and the same user's next `POST /activities` succeeds · **reject sets the reason and does *not* bump `tokenVersion` — the rejected member's existing access token still works, and they can still book, cancel and review** · a rejected applicant hitting an organizer route → 403 · re-applying inside the 30-day cooldown → `403 ORGANIZER_APPLICATION_REJECTED` with `details.canReapplyAt` · **a non-admin calling `/admin/organizer-requests/:id/approve` gets 403** · an admin approving their own request → `403 CANNOT_SELF_MODERATE` · `PATCH /users/me` with `{organizerStatus:'approved'}` leaves it unchanged.

*Bypass resistance.* Every guard above is asserted by calling the API directly with a crafted token, never through the UI: a valid token for an unverified account is refused by `requireVerified`; a valid token for a pending applicant is refused by `requireOrganizer`; a valid organizer token is refused by `requireOwnership` on another organizer's activity. **The frontend is never in the test path**, which is the point — it proves the server is the boundary.

**Phase 2 — discovery (~6)**
Each filter narrows correctly and in combination — **including `mood` matching against the `moods[]` array (a multi-mood activity appears under every one of its moods) and `energy` narrowing to a single level** · page 1 and page 2 do not overlap and `total` is consistent · `limit=999` clamps to 50 · `?sort[$where]=` and `?price[$gt]=` are rejected · only `published` activities appear · each `sort` value actually orders by that field.

**Phase 3 — integrity (~9). The suite that matters.**

> **The headline test.** An activity with `capacity: 1`. Twenty different **verified** users `POST /bookings` simultaneously via `Promise.allSettled`. Assert: exactly one `201`; exactly nineteen `409 SOLD_OUT`; `seatsBooked === 1`; `countDocuments({activity, status:'confirmed'}) === 1`. **Run it in a loop of ten iterations** — a race that fails five percent of the time will not show up in a single run.

*Completion job (moved here from Phase 6 with the job itself):* an activity past `endDateTime` becomes `completed` with `completedAt` · its confirmed bookings become `completed` · **running the job twice changes nothing the second time** *(idempotency)* · a cancelled booking never becomes `completed`.

*Completion job (moved here from Phase 6 with the job itself):* an activity past `endDateTime` becomes `completed` with `completedAt` · its confirmed bookings become `completed` · **running the job twice changes nothing the second time** *(idempotency)* · a cancelled booking never becomes `completed`.

Plus: the same user booking twice concurrently → one 201, one `409 ALREADY_BOOKED`, `seatsBooked` incremented **exactly once** *(this proves the compensation path)* · book → cancel → decrement exactly one · **cancel twice → one success, one 422, decrement exactly one** *(the negative-count test)* · cancel → rebook does not violate the partial unique index · booking a full activity → 409, count unchanged · booking after `startDateTime` → 422 · **`reconcile` repairs a deliberately corrupted `seatsBooked` and logs the correction.**

**Phase 4 — authorization, dashboards and aggregation (~12)**

*Authorization:* organizer A editing organizer B's activity → `403 NOT_OWNER` *(the one people forget)* · a user whose `organizerStatus` is `none`, `pending` or `rejected` creating an activity → 403 `ORGANIZER_REQUIRED` · `POST /activities` with `{status:'published', seatsBooked:99}` ignores both · capacity reduced below `seatsBooked` → 409 · activity cancellation cascades to every confirmed booking.

*Dashboard:* seed a known fixture and assert every figure against hand-counted values — activity counts by status, booking counts by status, total seats, **capacity utilisation percentage**, category mix, and the trend series · **a day with no bookings appears in the trend with zeros** *(the `$densify`/`$fill` test)* · **the weighted average rating differs from the naive average of averages on a fixture built to expose it** · `topActivities` returns five rows ordered by seats with correct fill rates · **organizer A's dashboard contains none of organizer B's activities or bookings** *(the scoping test — the most important one here)* · a brand-new organizer with zero data gets zeros, not `null` or a 500 · `from`/`to` outside the 365-day cap → 400 · a non-admin calling `/admin/dashboard` → 403.

**Phase 5 — discovery scoring and AI (~8)**

*Scoring:* known inputs produce known ranks · an anonymous request does not collapse every result to an identical score.

*AI:* a mocked successful provider returns explanations mapped to the right activity ids · **a provider response containing an activityId that was never sent has that entry dropped** · a malformed/non-JSON response falls back to templates with `source: 'template'` · **a provider timeout falls back within the budget and the endpoint still returns 200** · a provider 500 falls back · **with `AI_ENABLED=false` the endpoint returns templated explanations and makes no outbound call** · the rate limit returns 429 on the eleventh call in a minute · no request body sent to the provider contains a user id, name, email, phone or coordinates *(assert on the mock's captured payload)*.

**Phase 6 — notifications, SMS, completion and reviews (~10)**

*SMS:* a confirmed booking triggers `sendSms` with the right E.164 number and a body containing the booking reference · **a throwing provider leaves the booking `confirmed` and the response `201`** — the single most important test in this group · a user without `smsOptIn` is never sent anything · a user without a phone is never sent anything · `SMS_ENABLED=false` makes no outbound call.

*Reviews:* **any verified member with a `completed` booking can review once** · an unverified member with a completed booking → `403 EMAIL_NOT_VERIFIED` · a user with a `confirmed` (not completed) booking → `403 NOT_ATTENDED` · a user with no booking → 403 · a user who cancelled → 403 · **a second review by the same user → `409 ALREADY_REVIEWED`** · **`ratingAvg` and `ratingCount` match a hand-computed value after create, after edit, after delete, and after an admin hides one** *(invariant I4)* · editing after 7 days → 422 · an organizer can reply once to a review on their own activity and not on someone else's.

### Manual E2E checklist — before any milestone demo

Register → **try to book while unverified and see the prompt** → verify email → set interests → browse → filter → sort → "I'm bored" → **see AI explanations appear after results** → open detail → book → **receive email and SMS** → see it in My Bookings → cancel → confirm the count changed. Organizer: activate → create → upload image → publish → see the booking arrive → **open the dashboard and check the numbers against the attendee list** → cancel the activity → confirm attendees were notified. Admin: **open the organizer-request queue, approve one, reject one with a reason** → confirm the rejected member can still book → check the platform dashboard. Post-completion: run the completion job → **leave a review** → confirm the rating on the activity page and on the organizer dashboard. Plus forgot-password end to end, and typing a protected URL directly into the address bar while logged out.

### Seed data — must support all of the above

`scripts/seed.js` produces, with a fixed faker seed: ~40 members (`organizerStatus: 'none'`), **all `isEmailVerified: true` so bookings and reviews work in development, plus 2 deliberately unverified to exercise the §18 gate** · 1 admin · 8 approved organizers · **3 with `pending` organizer requests so the admin queue is not empty, and 1 `rejected` with a reason** · 33 categories across 5 moods · ~120 activities spread across all five moods and all three energy levels — **including multi-mood activities so the `moods[]` array is genuinely exercised** — and **at least 15 already `completed`** · ~400 bookings with **~80 already `completed`** · ~150 reviews on those completed bookings, with a skewed rating distribution so the dashboard charts are not flat · activities clustered around five city anchors with real coordinates, written through the `toGeoPoint(lat, lng)` helper.

**The verified accounts and the completed activities and bookings are not optional.** Without them Review is unreachable, `ratingAvg` is zero everywhere, and the dashboard's rating and completion figures are all zero — which looks like a bug and is impossible to demonstrate.

The script **refuses to run when `NODE_ENV === 'production'`** or when the Mongo URI is not a known development host.

### CI

GitHub Actions on push and pull request: install → lint → server tests → client tests. Twenty minutes to set up, and it keeps a broken `main` from being what gets demonstrated (§28).

---

## 27. Deployment

```
Browser ──► Vercel (CDN, HTTPS)           React static build
   │
   ├── HTTPS  axios, withCredentials
   ▼
Render / Railway                           Node + Express + completion job
   │
   ├──► MongoDB Atlas M0    (replica set → transactions available)
   ├──► Cloudinary
   ├──► Nodemailer / Resend
   ├──► Twilio
   └──► AI provider
```

### Order — this order, for a reason

1. **Atlas first.** Cluster created in Phase 0 with a least-privilege database user (`readWrite` on `outly`, **not** an admin user).
2. **Backend second**, with the health endpoint working before the frontend exists. Confirm `GET /api/v1/health` returns `{ db: 'connected' }` from a browser.
3. **Frontend third**, pointed at the live API URL.
4. **CORS and cookies last — and this is the step that will fail.** Add the Vercel origin to the allowlist, set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`, redeploy, then test login **in production, in an incognito window**, and confirm the refresh cookie is set and survives a hard reload.

### Platform configuration

| Item | Setting |
|---|---|
| Vercel | root `client`, build `npm run build`, output `dist`, **SPA rewrite `/(.*) → /index.html`** — without it a hard refresh on `/activities/123` returns Vercel's 404 |
| Vite env | `VITE_*` variables are **inlined at build time**; changing one requires a redeploy. **Never give a secret a `VITE_` prefix** |
| Render/Railway | root `server`, start `node src/server.js`, health check `/api/v1/health` |
| Express | `app.set('trust proxy', 1)`, bind `process.env.PORT`, `NODE_ENV=production` |
| Mongoose | `autoIndex: false` in production; indexes created once by script or through Atlas |
| Free-tier sleep | Render sleeps after ~15 min; the first request then takes 30–60 s and the completion job does not run. Either use Railway, or ping `/health` externally, or expose the job behind a secret-guarded endpoint and trigger it externally. **Decide before the demo, not during it.** |

### Environment variables

```
server core     NODE_ENV · PORT · MONGODB_URI
auth            JWT_ACCESS_SECRET · JWT_REFRESH_SECRET
                JWT_ACCESS_EXPIRES · JWT_REFRESH_EXPIRES · BCRYPT_SALT_ROUNDS
cors/cookies    CLIENT_URL · CORS_ORIGINS · COOKIE_SECURE · COOKIE_SAMESITE
email           SMTP_HOST · SMTP_PORT · SMTP_USER · SMTP_PASS · EMAIL_FROM
cloudinary      CLOUDINARY_CLOUD_NAME · CLOUDINARY_API_KEY
                CLOUDINARY_API_SECRET · CLOUDINARY_FOLDER
ai              AI_ENABLED · AI_API_KEY · AI_BASE_URL · AI_MODEL
                AI_MAX_TOKENS · AI_TIMEOUT_MS · AI_DAILY_CALL_CAP
twilio          SMS_ENABLED · TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN
                TWILIO_PHONE_NUMBER · SMS_TIMEOUT_MS · SMS_DAILY_CAP_PER_USER
limits/logging  RATE_LIMIT_WINDOW_MS · RATE_LIMIT_MAX · LOG_LEVEL

client          VITE_API_URL          ← the only client variable. Nothing else.
```

Every one is in the Zod env schema and validated at boot. `AI_ENABLED` and `SMS_ENABLED` default to `false`, so a missing credential yields a degraded-but-working deployment rather than a crash loop. `.env` is never committed; `.env.example` is always committed and updated in the same commit that introduces a variable. Generate secrets with `openssl rand -base64 48`.

---

## 28. Git and GitHub workflow

A development-process requirement, not a runtime feature. It belongs in the architecture document because **the security of every secret in §27 depends on it.**

### Repository

One repository, two applications — `client/`, `server/`, `docs/`. One history, one README, one CI workflow, and atomic commits when an API change and its client change together. Vercel and Render both support a root-directory setting, so a single repo deploys cleanly to both.

### Branches

Solo project, so **trunk-based with short-lived feature branches**. Git Flow is ceremony for a team shipping versioned releases and buys nothing here.

```
main                always deployable — this is what is demonstrated
  ├── feat/auth-approval
  ├── feat/organizer-dashboard
  ├── feat/ai-explanations
  ├── feat/reviews
  └── fix/booking-race
```

One branch per phase or per meaningful feature. Merge with `--no-ff` so the phase boundary stays visible. **Tag each completed phase** — `git tag -a v0.4-dashboards -m "Phase 4: organizer and admin dashboards"`. Those tags are the cheapest possible evidence of incremental work.

### Commits — Conventional Commits

`type(scope): subject` — imperative, lowercase, no trailing period, ≤72 characters. Types: `feat` · `fix` · `refactor` · `test` · `docs` · `chore` · `perf`.

```
feat(organizer): add organizerStatus and the organizer request flow
feat(admin): add organizer request approve and reject endpoints
feat(stats): add organizer dashboard aggregation with $facet
fix(stats): weight average rating by review count
feat(ai): add discovery explanation service with templated fallback
feat(sms): send booking confirmation via twilio without blocking the booking
feat(reviews): add review model with eligibility gate and rating recompute
test(booking): add concurrent last-seat race test
perf(activities): add status+ratingAvg index for the rating sort
docs(readme): document env vars and local setup
```

**Push after every meaningful commit, not once a week.** Sixty to a hundred commits across the project reads as steady incremental work — which is exactly what a process criterion is looking for. A single "final project" commit reads as the opposite, whatever the code quality.

### Pull requests

Optional for a solo developer, valuable anyway: open one per phase branch, let CI run, use the description to record what the phase delivered and what it deliberately left out. It creates a written trail of decisions that a README cannot.

### Secrets — the non-negotiable part

- **`.gitignore` containing `.env` and `.env.*` is committed in the very first commit**, before any dependency is installed. This ordering is what guarantees a secret is never committed.
- `.env.example` is committed with every key present and every value **blank**, and is updated in the same commit that introduces a new variable.
- Production values live in the Vercel and Render dashboards. Never in the repository, never in a screenshot, never in the README.
- **A secret pushed once is compromised forever**, even after a later commit removes it — git history keeps it. The only remedy is to rotate the credential and then rewrite history. With five external services in v4, this risk is five times what it was in v3.
- Add a `gitleaks` or `git-secrets` pre-commit hook if time allows. Ten minutes, and it catches the mistake before it becomes permanent.

### `.gitignore`

```
node_modules/   dist/   build/   .vite/
.env    .env.*    !.env.example
*.log   coverage/   .nyc_output/
.DS_Store   .vscode/   .idea/
```

### README

Title and one-line description · live URLs · screenshots · features by role · tech stack **with reasons** · architecture diagram · local setup (prereqs, clone, install, env, seed, run) · env var table · API summary · **the five models** · testing instructions · deployment notes · **known limitations and future work**.

That last section matters more than it looks. "Refresh-token rotation deferred; `tokenVersion` revocation used instead" or "AI explanations degrade to templates when the provider is unavailable" demonstrates that a constraint was understood and a trade-off was chosen. It reads as engineering judgement, not as an admission.

---

## 29. Phase 0 — file manifest and contract lock

Phase 0's job is to leave **zero architectural decisions** for later. Everything below is a decision or a scaffold; none of it is business logic.

### Decisions locked here

| Decision | Value |
|---|---|
| Module system | **ESM** (`"type": "module"`) in both apps. Never mixed with `require`. |
| API version | `/api/v1`, from the first route |
| Success envelope | `{ success, data, meta: { page, limit, total, totalPages } }` |
| Error envelope | `{ success: false, error: { code, message, details? } }` |
| Error codes | the frozen registry in §20; codes are added to that file, never inline |
| `ApiError` signature | `(statusCode, code, message, details?)` |
| `validate` signature | `(schema, source)` — **replaces** `req[source]` |
| Middleware order | fixed, per §23 |
| Index policy | `autoIndex` true in dev, **false in production** |
| Query keys | the `queryKeys.js` factory in §22 |
| `queryClient` defaults | `staleTime 60s`, `retry 1`, no refetch on focus, never retry 4xx |
| Axios contract | `withCredentials`, bearer attach, single-flight 401 refresh |
| Filter state | lives in the **URL**, never duplicated in component state |
| Test stack | Vitest + Supertest + mongodb-memory-server |
| Deploy targets | Vercel + Render (or Railway) + Atlas M0 — **chosen and accounts created, not yet deployed** |

### Backend files

| Path | Purpose |
|---|---|
| `server/package.json` | `"type":"module"`; scripts `dev`, `start`, `test`, `lint`, and placeholders for `seed`, `reconcile` |
| `server/.env.example` | every variable from §27, values blank |
| `server/src/config/env.js` | Zod schema over `process.env`; crashes at boot on a missing variable; frozen export |
| `server/src/config/db.js` | mongoose connect with `serverSelectionTimeoutMS`, connection event logging, fail-fast |
| `server/src/config/logger.js` | pino; pretty in development only; request id on every line |
| `server/src/utils/ApiError.js` | operational error class |
| `server/src/utils/ApiResponse.js` | envelope builder |
| `server/src/utils/asyncHandler.js` | wraps async controllers, forwards to the error handler |
| `server/src/utils/errorCodes.js` | **the frozen §20 registry** |
| `server/src/middleware/notFound.js` | unknown route → `ApiError` |
| `server/src/middleware/error.js` | the terminal four-arg handler, with all translations from §23 |
| `server/src/middleware/validate.js` | the generic `validate(schema, source)` |
| `server/src/middleware/rateLimit.js` | global + auth limiters per §18 |
| `server/src/routes/index.js` | mounts everything under `/api/v1` |
| `server/src/routes/health.routes.js` | `GET /health` |
| `server/src/controllers/health.controller.js` | returns `{ status, uptime, db }` |
| `server/src/app.js` | assembles middleware + routes, **exports the app, no `listen()`** |
| `server/src/server.js` | connects the DB, listens, handles `SIGTERM`, `unhandledRejection`, `uncaughtException` |
| `server/tests/setup.js` | mongodb-memory-server lifecycle |
| `server/tests/health.test.js` | one passing test, proving the harness works |

Empty-but-created, with a `.gitkeep`: `models/`, `services/`, `validators/`, `jobs/`, `templates/emails/`, `scripts/`.

### Frontend files

| Path | Purpose |
|---|---|
| `client/package.json`, `vite.config.js` | `@/` alias configured |
| `client/.env.example` | `VITE_API_URL` |
| `client/tailwind.config.js`, `src/index.css` | Tailwind wired and verified |
| `client/src/main.jsx` | mounts `<App/>` inside `<Providers/>` |
| `client/src/app/providers.jsx` | QueryClientProvider · BrowserRouter |
| `client/src/app/router.jsx` | `/` and `*` |
| `client/src/app/App.jsx` | shell |
| `client/src/shared/lib/axiosClient.js` | the single instance, `baseURL` from env, `withCredentials`. **No interceptors yet** — they arrive with auth in Phase 1 |
| `client/src/shared/lib/queryClient.js` | the defaults above |
| `client/src/shared/lib/queryKeys.js` | the key factory |
| `client/src/shared/lib/errorMessages.js` | error code → copy, seeded with the §20 codes |
| `client/src/shared/components/` | Spinner · EmptyState · ErrorState · Button — used from the first component onward |
| `client/src/features/` | feature folders created empty with `.gitkeep` |
| `client/src/pages/Home.jsx` | fetches `/health` via TanStack Query, **rendering loading and error states explicitly** |

### Repository files

`.gitignore` (with `.env`, **committed first**) · `README.md` · `.nvmrc` · ESLint + Prettier configs in both apps · `.github/workflows/ci.yml` (install → lint → test) · `docs/ARCHITECTURE.md` (this document).

### Phase 0 exit checklist

**Repository**
- [ ] `outly/` with `client/`, `server/`, `docs/`
- [ ] `git init`, branch `main`, `.gitignore` with `.env` **committed in the first commit**
- [ ] Pushed to GitHub; `node_modules` confirmed absent from the remote
- [ ] `.env.example` complete in both apps and committed; `.env` filled and ignored
- [ ] `.nvmrc`, ESLint, Prettier, CI workflow green

**Backend**
- [ ] `npm run dev` starts with hot reload; `"type":"module"` everywhere
- [ ] Env validated by Zod at boot; a missing variable crashes with a readable message
- [ ] Local `mongod` connects **and** an Atlas M0 cluster exists with a scoped user
- [ ] `GET /api/v1/health` → 200 with `db: 'connected'`
- [ ] An unknown route returns the standard 404 envelope, not an HTML stack trace
- [ ] A thrown error returns the standard error envelope with no stack trace leaked
- [ ] helmet, cors, json limit, cookieParser, mongoSanitize, compression, pino, rateLimit all wired in the §23 order
- [ ] `app.js` exports the app and does **not** call `listen()`
- [ ] `npm test` runs and one test passes

**Frontend**
- [ ] `npm run dev` serves; `npm run build` produces `dist/` without errors
- [ ] Tailwind applies; `@/` alias resolves
- [ ] Router renders `/` and a 404 route
- [ ] QueryClientProvider mounted; devtools available in development
- [ ] Axios instance reads `VITE_API_URL` and sets `withCredentials`

**The vertical slice**
- [ ] The home page displays live data fetched from `/health`
- [ ] Stop the backend → the **error state** renders, not a blank page
- [ ] Remove the origin from `CORS_ORIGINS` → the request is blocked; restore it
- [ ] Both apps run concurrently without a port conflict

**Not in Phase 0:** no models, no auth, no Cloudinary, no email, no business logic. If any appear, Phase 0 has expanded and lost its purpose.

---

## 30. Implementation protocol

For every feature from here:

1. Inspect existing code before touching it.
2. Identify affected files explicitly.
3. State the implementation plan before writing code.
4. Reuse existing components and services rather than duplicating.
5. Implement the smallest correct change for the task at hand.
6. Never rewrite unrelated code.
7. Run lint, build and tests.
8. Report which files changed and any known remaining issues.
9. **If a request conflicts with this architecture** — "add paid bookings in Phase 2", "auto-enable organizer on create", "just read the count and increment it" — **flag the conflict before writing code**, rather than silently reintroducing something that was deliberately removed.

---

## 31. Recommended `CLAUDE.md` rules

```md
## Product rules
- Core loop: discover → book → attend → review.
- Activities are concrete, single scheduled instances (no templates or recurrence).
- MVP supports free activities only (price must be 0).
- Paid booking is Phase 7, gated on a real payment gateway.
- "I'm bored" is a deterministic, rules-based discovery flow. AI EXPLAINS the
  results; it never ranks, selects, or filters them.

## Backend rules
- Backend is authoritative for price, capacity, booking state, approval and permissions.
- Controllers never access Mongoose models directly — only through services.
- Booking capacity changes are a single atomic DB operation, and every reserve
  has a compensating rollback. Never read-then-write a counter.
- Cancellation is guarded on the booking's status transition, not on ownership alone.
- Only confirmed bookings consume seats; cancelled bookings release them.
- One confirmed booking per user per activity (partial unique index).
- One review per user per activity (unique index). A review requires a booking
  with status 'completed'. ratingAvg/ratingCount are recomputed by aggregation,
  never by incremental arithmetic.
- Offline activities use GeoJSON Point at location.geo with a 2dsphere index,
  coordinates as [longitude, latitude]; online activities omit location entirely.
- Never trust client-supplied price, totalPrice, status, organizer, seatsBooked,
  ratingAvg, ratingCount, role or organizerStatus.
- Organizer routes require BOTH requireOrganizer AND requireOwnership.
- Booking, booking management, reviewing and the organizer request require
  requireAuth + requireVerified. NEVER gate them on admin approval.
- Admin approval applies to ORGANIZER REQUESTS only. There is no general user
  approval, and requireApproved does not exist.
- Organizer routes require requireAuth + requireVerified + requireOrganizer,
  and requireOwnership too on owned resources.
- role is 'user' | 'admin'; organizerStatus is the organizer capability AND its
  approval state in one field. Never add a role, and never add a second field
  alongside organizerStatus.
- tokenVersion is bumped on exactly three events: logout, password reset,
  password change. NEVER on organizer rejection — a rejected applicant is a
  fully valid verified member.
- §18's authorization matrix is authoritative. If a route guard and the matrix
  disagree, the matrix is right and the route is a bug.
- Never say "organizer activation". The model is: organizer request → admin
  review → approved or rejected.
- Validate bodies AND query params with Zod; validate() replaces req[source].
- Error codes come from utils/errorCodes.js — never invent one inline.
- app.js exports the app and never calls listen().

## Statistics rules
- Every dashboard figure comes from a MongoDB aggregation pipeline in
  stats.service.js. Never count in a controller, and never count in the browser.
- Organizer pipelines $match on req.user._id as the FIRST stage, always.
- $match before $lookup; $limit before $lookup; $project before $group.
- Average rating is weighted by ratingCount — never $avg of per-activity averages.

## External service rules
- All outbound calls go through services/external/ and its shared httpClient.
- API keys are read from the validated env object, never from process.env
  directly, and never logged or returned.
- One retry maximum, only on network errors or 5xx. Never retry a 4xx.
- SMS and email are dispatched AFTER the response and are individually wrapped.
  A booking must NEVER fail because a provider is unavailable.
- The AI provider is untrusted input: validate its response with Zod, drop any
  activityId that was not sent, and fall back to templated explanations.
- Never send user id, name, email, phone, coordinates or history to the AI provider.

## Frontend rules
- Tailwind is the UI framework. Do not add Bootstrap, MUI, or any second
  component library.
- Organize by feature, not by file type.
- TanStack Query owns all server state; no global client-state library.
- Every server call goes through a custom hook in shared/hooks. No component
  calls axios directly and no component writes a query key by hand.
- Query keys come from shared/lib/queryKeys.js.
- Filter state lives in the URL, never duplicated in component state.
- Access token in memory, never localStorage. The router renders nothing
  protected until the auth bootstrap resolves.
- Every data view handles loading, empty, and error states explicitly.
- Never optimistically update a booking.
- Frontend permission checks are UX only. The backend is the boundary.

## Scope rules
- No microservices, no Redis, no queues, no Kafka, no Kubernetes, no gateway.
- No ML model training. A third-party AI API is the integration.
- No chat, no recurring events, no real-time infra, no social graph — until a
  concrete requirement justifies each one.

## Design-scope rules
- ARCHITECTURE.md is the technical design. It does not specify visual design,
  copy, wireframes, or component styling — those belong to the UI/UX track (§3).
- The frontend never fabricates data the API does not return.
- On conflict: the API contract wins on data shape; the UI/UX doc wins on
  presentation and language.
```

---

## 32. Final target architecture

```
React SPA  (Vite · React Router · TanStack Query · Axios · Tailwind · 18 custom hooks)
   ↓  filter state in the URL · access token in memory · refresh in httpOnly cookie
Express REST API  (/api/v1 · 43 endpoints)
   ↓  Routes → Middleware → Controllers → Services → Mongoose
MongoDB Atlas  (5 models · 20 indexes · 2dsphere from day one
                · 6 aggregation pipelines · one transaction, for activity cancellation)

Integrity:  atomic conditional reserve + compensating rollback
            + three unique indexes + rating re-aggregation + reconcile script

Server-to-server, all through services/external/ with one HTTP client:
   Nodemailer       → Phase 1 (transport) · Phase 6 (notifications)
   Cloudinary       → Phase 4 (images)
   AI provider      → Phase 5 (discovery explanations, with templated fallback)
   Twilio           → Phase 6 (SMS on three triggers, never blocking a booking)

Scheduled:  one completion job (Phase 6)
Deferred:   payments (7) · $geoNear + maps, rotation, OTP, analytics (8)

Parallel, non-blocking track:
   UI/UX design     → docs/UX.md — see §3. Does not gate any phase.
```

**Five models. 43 endpoints. 25 error codes. Twenty indexes. Six aggregation pipelines. Four external integrations. Two roles. One hard problem — concurrent capacity — solved once, tested properly, and read from by everything else.**

---

## 33. Rubric compliance audit

Every Must-Have, its home in this document, the phase that delivers it, and its status. **No requirement is deferred.**

| # | Requirement | Architecture section | Phase | Status |
|---|---|---|---|---|
| 1 | **Five implemented database models** | §5 Activity · §6 Category · §7 User · §8 Booking · §9 **Review** | 1–6 | **IMPLEMENTED IN MVP** |
| 2 | **Authentication** | §18 — JWT access + httpOnly refresh, bcrypt 12, `tokenVersion` | 1 | **IMPLEMENTED IN MVP** |
| 3 | **Authorization** | §7 guard primitives · §18 guard stack · §19 per-route column | 1–6 | **IMPLEMENTED IN MVP** |
| 4 | **Maximum 2–3 roles** | §7 — exactly two (`user`, `admin`); organizer is a capability | 1 | **IMPLEMENTED IN MVP** |
| 5 | **Client-side validation** | §21 + §22 — Zod schemas mirrored in `shared/lib/validators/` | 1–6 | **IMPLEMENTED IN MVP** |
| 6 | **Server-side validation** | §21 — `validate(schema, source)` replaces `req[source]` | 0–6 | **IMPLEMENTED IN MVP** |
| 7 | **Email integration** | §16 Nodemailer · §17 nine triggers | 1, 6 | **IMPLEMENTED IN MVP** |
| 8 | **Forgot password** | §18 — hashed single-use token, 1 h, always-204, `tokenVersion` bump | 1 | **IMPLEMENTED IN MVP** |
| 9 | **Routing** | §22 — React Router, protected / approval-aware / admin routes | 1–6 | **IMPLEMENTED IN MVP** |
| 10 | **Dashboard with statistics** | §15 — organizer dashboard **and** admin dashboard | 4 | **IMPLEMENTED IN MVP** |
| 11 | **MongoDB aggregation for statistics** | §15.3 — 16 operators across 6 pipelines, with an operator-to-statistic map | 4 | **IMPLEMENTED IN MVP** |
| 12 | **Search** | §14 · §21 — text index on `title` + `tags`, `q` parameter | 2 | **IMPLEMENTED IN MVP** |
| 13 | **Sorting** | §14 · §21 — `soonest` · `newest` · `popular` · `rating` | 2, 6 | **IMPLEMENTED IN MVP** |
| 14 | **Pagination** | §19 envelope `meta` · §21 `limit` capped at 50 | 2 | **IMPLEMENTED IN MVP** |
| 15 | **Query parameters** | §21 — coerced, enum-checked, range-capped, `superRefine` cross-field | 2, 4 | **IMPLEMENTED IN MVP** |
| 16 | **File upload** | §16 Cloudinary · §19 image endpoints — Multer memoryStorage, magic-byte check | 4 | **IMPLEMENTED IN MVP** |
| 17 | **Cloud storage** | §16 — Cloudinary, `publicId` persisted so assets can be deleted | 4 | **IMPLEMENTED IN MVP** |
| 18 | **Server-to-server communication** | §16 — four integrations behind one shared HTTP client | 1, 4, 5, 6 | **IMPLEMENTED IN MVP** |
| 19 | **AI integration** | §14 AI refinement · §16 `ai.service.js` — validated output, templated fallback | 5 | **IMPLEMENTED IN MVP** |
| 20 | **Admin approval of users** *(implemented as admin approval of users requesting organizer capability — see note below)* | §7 organizer lifecycle · §18 matrix · §19 `/admin/organizer-requests/*` | 1 | **IMPLEMENTED IN MVP** |
| 21 | **SMS integration (Twilio)** | §16 `sms.service.js` · §17 three triggers, never blocking a booking | 6 | **IMPLEMENTED IN MVP** |
| 22 | **React hooks** | §22 — 18 custom hooks over the query layer, plus conventional built-ins | 1–6 | **IMPLEMENTED IN MVP** |
| 23 | **UI framework** | §22 — Tailwind, explicitly, with no second library | 0–6 | **IMPLEMENTED IN MVP** |
| 24 | **Data-integrity testing** | §10 invariants · §26 Phase 3 concurrency suite · `reconcile` | 3 | **IMPLEMENTED IN MVP** |
| 25 | **Deployment** | §27 — Vercel + Render/Railway + Atlas, live from the end of Phase 1 | 1, then every phase | **IMPLEMENTED IN MVP** |
| 26 | **GitHub workflow** | §28 — trunk-based branches, conventional commits, phase tags, CI, secret hygiene | 0, ongoing | **IMPLEMENTED IN MVP** |

**26 of 26 Must-Haves implemented inside the MVP. Nothing marked P1, deferred, or partial.**

**Note on requirement 20.** The rubric wording is "admin approval of users". Outly implements it as **admin approval of users requesting organizer capability**: a member submits a request, an administrator reviews it against the message, link and booking history, and approves or rejects it with a reason. The approval state lives on the `User` document (`organizerStatus`), the queue and both decision endpoints are admin-only, and a rejection is recorded with its author and reason. What Outly deliberately does **not** do is require approval before an ordinary member may browse or book — that would put an administrator between a member and the thirty-second experience the product exists to deliver, and it is not what the requirement is protecting against. The control is stated here plainly rather than claimed more broadly than it is implemented.

### Contradictions introduced by these changes — found and fixed

| Contradiction | Resolution |
|---|---|
| "Four models in MVP" (v3.1 §22, §28) vs Review now shipping | Every count updated to five; the "Models in the MVP" note removed from §25 and replaced with the full five-model list |
| `ratingAvg` / `ratingCount` described as "P1 seams, written by nothing in MVP" (v3.1 §5) | Now live, maintained by `review.service.js`, listed under invariant I4, and removed from the deliberate-seams list |
| "Reviews and ratings — out of the MVP" (v3.1 §22) | Removed; reviews appear in the in-scope table with their section and phase |
| `CLAUDE.md` rule "Review MUST NOT be built during Phases 0–6" (v3.1 §27) | Reversed; replaced with rules governing eligibility and rating recompute |
| `sort=rating` "not in the MVP enum" (v3.1 §9, §18) | Now in the enum, backed by the new `{status, ratingAvg}` index |
| Review indexes and error codes marked "P1, not created during the MVP" (v3.1 §13, §17) | Now in the main index list and the main registry |
| Phase 8 still listing "reviews & ratings" | Removed from Phase 8; Phase 8 retains the review *moderation queue* only |
| "12 MVP indexes" (v3.1 §32) | Now 20, itemised in §13 |
| "22 MVP endpoints" (v3.1 §32) | Now 40, itemised in §19 |
| "18 error codes" (v3.1 §17) | Now 24, itemised in §20 |
| Phase 5 described as the only phase with float (v3.1 §24) | No longer true once every phase carries a rubric requirement; §24 states that float is gone |
| v3.1 §16 API table described as "the MVP API surface" excluding reviews | Reviews are now a section of that table |
| External services listed only as Cloudinary and Nodemailer (v3.1 §4, §32) | Diagrams and lists now include Twilio and the AI provider |
| No admin approval anywhere in the User schema, guards, validation whitelist or tests | Added in v4, narrowed to organizer requests in v4.1, final in v5 |
| *(v5)* "Browsing and booking are permitted while unverified" (v4.1 §18) contradicted the required lifecycle | Removed. Booking, booking management, reviewing and the organizer request now require `requireVerified`; browsing stays open (§18) |
| *(v5)* `requireApproved`, `approvalStatus`, `organizerEnabled`, `organizerVerified` surviving as active concepts | Removed from every active section. They appear only in this changelog and the §7 migration note, both clearly historical |
| *(v5)* "Organizer activation" language implying self-service | Replaced throughout with organizer request → admin review → approved/rejected |
| *(v5)* `tokenVersion` policy scattered and contradictory across §7, §18, §19 and §26 | Consolidated into one exhaustive list in §18: logout, password reset, password change — and explicitly **not** organizer rejection |
| *(v5)* Completion job in Phase 6 created an intra-phase dependency with Review | Moved to Phase 3 with the booking lifecycle; Phase 6's three pieces are now independent (§24) |
| *(v5)* Seed accounts unverified, which would have made every booking in development fail | Seed members are verified, with two deliberately unverified to exercise the gate (§26) |

---

## 34. Approval checklist

Carried forward from v2/v3/v3.1 and confirmed still true:

- [x] Activity is the single scheduled-experience entity — no separate Event model.
- [x] Organizer activation is explicit, never an automatic side effect.
- [x] MVP booking is free-only; manual/offline payment stays removed.
- [x] Capacity and booking-state rules are explicit and enforced atomically.
- [x] Coordinates use GeoJSON `Point` + `2dsphere` from day one.
- [x] `bookingReference` and lifecycle timestamps on activities and bookings.
- [x] "I'm bored" is a first-class frontend route and backend endpoint.
- [x] API versioned under `/api/v1` with a consistent envelope.
- [x] `role: 'user' | 'admin'`; `organizerStatus` is the organizer capability and its approval state.
- [x] `Category.mood` is a flat enum; `Activity.categorySlug` is denormalised and server-set.
- [x] Partial unique index on `{user, activity}` where confirmed; `quantity ≤ 4`.
- [x] Booking write has a compensating rollback; cancellation is guarded on the status transition.
- [x] `tokenVersion`, logout, email verification and forgot/reset password all exist.
- [x] Discovery scoring runs in an aggregation pipeline; `popularity` is the fill ratio.
- [x] Indexes are compound and correctly ordered; error codes are a frozen registry.
- [x] §3 separates Architecture/Technical Design from UI/UX Design.
- [x] Testing and deployment appear in the phase plan.

New in v4:

- [x] **V1** `Review` is the fifth **implemented** model, built in Phase 6 after the completion job that gates its eligibility rule. `ratingAvg` / `ratingCount` are live and governed by invariant I4.
- [x] **V2** *(as revised in v4.1)* `organizerStatus` with admin approve and reject endpoints, gating publishing only. Booking and reviewing are never gated on approval.
- [x] **V3** Organizer and admin dashboards, every figure produced by a backend aggregation endpoint — nothing computed in the browser.
- [x] **V4** Six MongoDB aggregation pipelines using sixteen operators, with §15.3 mapping each statistic to the operators that produce it, and the weighted-average-rating correction documented.
- [x] **V5** All four external integrations consolidated behind `services/external/` and one shared HTTP client with timeout, bounded retry, key injection and error mapping.
- [x] **V6** AI refines discovery by explaining results; the deterministic scorer still ranks them. Output is Zod-validated against the ids that were sent; a failure falls back to templated explanations and the product remains fully usable with `AI_ENABLED=false`.
- [x] **V7** Twilio SMS on three triggers, dispatched after the response and individually wrapped — **a booking can never fail because SMS failed**.
- [x] **V8** Eighteen custom React hooks documented, each wrapping one endpoint through the `queryKeys` factory.
- [x] **V9** Git and GitHub workflow documented, including the secret-hygiene rules that five external services now make five times as important.
- [x] **V10** Tailwind named as the UI framework, with the decision not to add a second one recorded.
- [x] **All 26 Must-Have requirements audited in §33 and marked IMPLEMENTED IN MVP.**
- [x] **Fourteen contradictions introduced by these changes were found and fixed**, listed in §33.
- [x] No microservices, no Redis, no queues, no gateway, no ML training, no stack change, and no weakening of any existing integrity or security rule.

New in v4.1:

- [x] **W1** Admin approval narrowed to **organizer requests only**. Registering, browsing, discovery, **booking** and **reviewing** require no approval — an ordinary member has full access from the moment the account exists.
- [x] **W2** `organizerEnabled` + `approvalStatus` collapsed into a single `organizerStatus: 'none' | 'pending' | 'approved' | 'rejected'`. `organizerVerified` dropped. `requireApproved` deleted; `requireOrganizer` is the only organizer gate.
- [x] **W3** `POST /organizer/request` opens a request and grants nothing; approval is the only path to `approved`. No auto-approval flag exists in any environment.
- [x] **W4** The request carries a message and an optional link, and the admin queue shows the applicant's booking history — so approval is a judgement, not a rubber stamp.
- [x] **W5** Rejection no longer bumps `tokenVersion`. A refused applicant keeps a fully working member account. 30-day cooldown before re-applying.
- [x] **W6** Migration maps existing publishers to `approved` and everyone else to `none`, so nobody is locked out and no live organizer goes offline.
- [x] Booking integrity, security model, API conventions, discovery, dashboards, AI design, notifications, phase plan and MVP scope are **unchanged**.

New in v5 — final consistency and the verified-member model:

- [x] **X1** A verified email address is required before **creating a booking**, **managing a booking**, **submitting a review**, and **requesting organizer capability**. Enforced by `requireVerified` on every one of those routes; browsing, search, sorting, discovery and activity details remain open.
- [x] **X2** Every obsolete concept removed from the active architecture — `approvalStatus`, `organizerEnabled`, `organizerVerified`, `requireApproved`, and all "organizer activation" language. They survive only in the changelog and the §7 migration note, both clearly labelled historical.
- [x] **X3** `tokenVersion` policy is exhaustive and stated once (§18): logout, password reset, password change. **Organizer rejection does not bump it** — a rejected applicant keeps a fully valid verified-member session.
- [x] **§18 is the single authorization authority** — five primitives, one six-persona matrix, one guard-composition table. Every route in §19 and every test in §26 conforms to it.
- [x] Error registry finalised at 25 codes: `ORGANIZER_APPLICATION_PENDING`, `ORGANIZER_APPLICATION_REJECTED` and `ALREADY_ORGANIZER` replace the older request codes; `EMAIL_NOT_VERIFIED` becomes a first-class boundary. No code exists without a route that raises it and a test that asserts it.
- [x] Completion job moved from Phase 6 to Phase 3, finishing the booking lifecycle in one phase and removing the intra-phase dependency that sat in the project's final phase. Total schedule unchanged at ~35 days.
- [x] Seed data verified by default, with two unverified accounts to exercise the gate.
- [x] Tests added for every verification boundary and for **direct-API bypass attempts**, proving the server — not the frontend — is the boundary.
- [x] Five models, booking integrity, atomic capacity, discovery, AI, Twilio, email, dashboards, aggregation, hooks, Tailwind, MVP boundary and deployment are **unchanged**.

New in v5.1:

- [x] **Y1** `Activity.energyLevel` — physical demand, independent of the `level` skill floor.
- [x] **Y2** `Activity.moods: [String]` — 1–3 moods per activity, server-seeded from the category, multikey-indexed. Activities are no longer forced into a single mood.
- [x] Both are **filters, not scoring components** — the five discovery weights remain at 1.00 and need no re-tuning.
- [x] Duration remains **derived**, never stored — a stored copy would drift from the schedule on the first reschedule.
- [x] No new endpoint: `GET /discover` ranks deterministically and `POST /discover/explain` carries the LLM layer. There is nothing to stub now and swap later, and the LLM never enters the ranking path.
- [x] **Y3** No fixed deadline. Day figures are relative sizing; phases close on definition of done; the UI/UX track is scheduled alongside Phases 2–4.
- [x] Scope remains fixed at the 26 Must-Haves. Having time is not a reason to pull Phase 7–8 features forward.

**This document is the implementation source of truth. Phase 0 may begin on confirmation.**

---

## 35. Finalization summary

### 1 · Final normal user lifecycle

```
Register → Verify email → Browse / Discover → Search · Filter · Sort
        → View activity details → Book → Attend → Activity completes → Review
```

Everything before **Book** is open to any account. Everything from **Book** onward requires a verified email address.

### 2 · Final email verification rules

**An unverified member may:** register · log in · refresh and log out · browse, search, filter and sort · view any activity · run "I'm bored" discovery and receive AI explanations · read reviews · view and edit their own profile · view their own (empty) bookings list · resend the verification email · use forgot/reset password.

**An unverified member may not:** create a booking · cancel or manage a booking · submit, edit or delete a review · request organizer capability · perform any organizer operation.

Enforced server-side by `requireVerified` (§18). `isEmailVerified` is read from the database on every request and is **not** carried in the JWT, so verifying an email takes effect on the very next call with no re-login.

### 3 · Final organizer lifecycle

```
Verified member → POST /organizer/request  (message + optional link)
   → organizerStatus: 'pending'      ← grants nothing
   → admin reviews the request alongside the applicant's booking history
   → approve  → 'approved'  → organizer capability unlocked
   → reject   → 'rejected'  → reason emailed · 30-day cooldown · session untouched
```

### 4 · Final role and capability model

| Field | Values | Meaning |
|---|---|---|
| `role` | `'user'` · `'admin'` | Member or staff. **There is no organizer role.** |
| `organizerStatus` | `'none'` · `'pending'` · `'approved'` · `'rejected'` | Has not requested · awaiting review · has organizer capability · was refused |
| `isEmailVerified` | boolean | The authorization boundary for booking, reviewing and requesting |

Pending and rejected applicants retain **every** verified-member capability. Organizer standing affects organizer operations and nothing else.

### 5 · Final booking authorization

- **Create:** `requireAuth + requireVerified`
- **Cancel / manage:** `requireAuth + requireVerified` + ownership, enforced in the guarded status transition

The booking mechanism itself is untouched: atomic conditional capacity reservation with `$expr`, database-authoritative availability, the partial unique index preventing duplicate confirmed bookings, compensating rollback on a failed write, guarded cancellation with a floor check, and the `reconcile` script.

### 6 · Final review eligibility

`requireAuth` + `requireVerified` + a `Booking` for `(user, activity)` with `status: 'completed'` + the activity itself `completed`. One review per member per activity, enforced by a unique index. **No administrator approval, and `organizerStatus` is irrelevant.** Rating, comment, `ratingAvg` / `ratingCount` recomputation by re-aggregation, organizer replies and admin hiding are all unchanged.

### 7 · Final admin approval model

Administrators approve **users requesting organizer capability** — not users in general. The queue, both decision endpoints and the reason field are admin-only; the state lives on the `User` document. Rejection records a reason and leaves the member's account and session completely intact.

### 8 · Obsolete concepts removed

| Removed | Replaced by |
|---|---|
| `approvalStatus` | `organizerStatus` |
| `organizerEnabled` | `organizerStatus === 'approved'` |
| `organizerVerified` | nothing — the review step made it meaningless |
| `requireApproved` | `requireVerified` and `requireOrganizer`, each with one job |
| `USER_NOT_APPROVED` | never existed as an active code; `EMAIL_NOT_VERIFIED` and `ORGANIZER_REQUIRED` cover the real cases |
| `ORGANIZER_REQUEST_PENDING` / `_REJECTED` | `ORGANIZER_APPLICATION_PENDING` / `_REJECTED`, plus `ALREADY_ORGANIZER` |
| "Organizer activation" · "activation endpoint" · "activation + ownership" | "organizer request and admin approval" · `POST /organizer/request` · "organizer request/status + ownership" |
| General admin approval of all users | Organizer-specific approval |
| `tokenVersion` bump on rejection | Bumped only on logout, password reset and password change |

### 9 · Consistency audit — confirmed

Every section was searched for `approvalStatus`, `organizerEnabled`, `organizerVerified`, `requireApproved`, `USER_NOT_APPROVED`, "organizer activation", "activation endpoint", "account rejection", "booking while unverified", and `tokenVersion` on organizer rejection. Each occurrence was classified as obsolete active architecture or a valid historical reference. **All obsolete occurrences were rewritten or removed. The survivors appear only in §2 (changelog), the §7 migration note and §33 (contradictions fixed), all clearly labelled historical.**

Cross-checked for agreement: overview · MVP scope · user lifecycle · verification · roles · organizer lifecycle · admin workflow · `User` model · schema · indexes · middleware · authorization matrix · API routes · services · booking flow · review flow · activity lifecycle · completion job · dashboards · discovery · AI · notifications · security · error codes · seed data · tests · phases · migration notes · rubric mapping · `CLAUDE.md` · changelog.

### 10 · Status

**v5 is the implementation baseline and is frozen.** It supersedes v4.1. The architecture, technology stack, MVP scope and ~35-day schedule are unchanged from v4.1; v5 adds no feature and removes no capability. Implementation may begin at Phase 0 (§29).
