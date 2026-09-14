# Outly — working rules

`docs/ARCHITECTURE.md` (v5.1) is the implementation source of truth. It is
frozen. If a request conflicts with it, **flag the conflict before writing
code** rather than silently reintroducing something that was deliberately
removed (§30).

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
  A controller longer than ten lines is holding logic that belongs in a service.
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
- `role` is 'user' | 'admin'; `organizerStatus` is the organizer capability AND
  its approval state in one field. Never add a role, and never add a second
  field alongside organizerStatus.
- tokenVersion is bumped on exactly three events: logout, password reset,
  password change. NEVER on organizer rejection — a rejected applicant is a
  fully valid verified member.
- §18's authorization matrix is authoritative. If a route guard and the matrix
  disagree, the matrix is right and the route is a bug.
- Never say "organizer activation". The model is: organizer request → admin
  review → approved or rejected.
- Validate bodies AND query params with Zod; `validate(schema, source)`
  REPLACES `req[source]` — that replacement is what closes mass assignment.
- Error codes come from `utils/errorCodes.js` — never invent one inline. Use the
  `apiError(code, message, details)` factory so the status comes from the registry.
- Nothing reads `process.env` except `config/env.js`. This is enforced by an
  ESLint rule, not by memory.
- `app.js` exports the app and never calls `listen()`.

## Statistics rules

- Every dashboard figure comes from a MongoDB aggregation pipeline in
  `stats.service.js`. Never count in a controller, and never count in the browser.
- Organizer pipelines `$match` on `req.user._id` as the FIRST stage, always.
- `$match` before `$lookup`; `$limit` before `$lookup`; `$project` before `$group`.
- Average rating is weighted by ratingCount — never `$avg` of per-activity averages.

## External service rules

- All outbound calls go through `services/external/` and its shared httpClient.
- API keys are read from the validated env object, never from `process.env`
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
- Every server call goes through a custom hook in `shared/hooks`. No component
  calls axios directly and no component writes a query key by hand.
- Query keys come from `shared/lib/queryKeys.js`.
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

- `docs/ARCHITECTURE.md` is the technical design. It does not specify visual
  design, copy, wireframes, or component styling — those belong to the UI/UX
  track (§3).
- The frontend never fabricates data the API does not return.
- On conflict: the API contract wins on data shape; the UI/UX doc wins on
  presentation and language.

## Deviations from the document, recorded deliberately

These are the only places the code knowingly differs from v5.1. Each is a
resolution of an internal inconsistency, not a shortcut.

- **`utils/errorCodes.js` holds 27 codes, not 25.** `NOT_FOUND` is added for
  unknown routes (§29 requires a 404 envelope; overloading `ACTIVITY_NOT_FOUND`
  for a mistyped URL would be a lie). `FORBIDDEN` is named by §18 but missing
  from the §20 table; §18 wins, being the authorization authority.
- **`express-mongo-sanitize` is not used.** It mutates `req.query` in place and
  Express 5 made that a getter, so the package throws. `middleware/sanitize.js`
  is the same behaviour, hand-rolled, in about ten lines.
- **Tailwind v4 has no `tailwind.config.js`.** §29's manifest predates v4's
  CSS-first config; tokens live in `@theme` in `client/src/index.css`.
- **`src/pages/` exists alongside `src/features/`.** §29 names
  `client/src/pages/Home.jsx` while §22's tree omits `pages/`. Route-level pages
  live in `pages/`, feature modules in `features/`.
- **The organizer migration is `scripts/migrateOrganizers.js`.** §7 names it
  that; §23's script list still says `migrateApprovals.js`, a leftover from the
  v4 approval model. §7 describes what the script actually does, so its name wins.
