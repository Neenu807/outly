# Outly

Activity discovery and booking platform. Find something to do tonight, book a
seat, show up, review it.

> **Status: Phase 1 built locally — auth, email verification, profile and
> organizer approval.** The first production deploy is next; see
> [`docs/DEPLOY.md`](docs/DEPLOY.md) and [Development phases](#development-phases).

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite | SPA with a fast dev loop; no SSR requirement to justify a framework |
| Routing | React Router 7 | Filter state lives in the URL, so results are shareable and the back button works |
| Server state | TanStack Query 5 | Caching, invalidation and the four render states without a client-state library |
| Styling | Tailwind CSS 4 | One styling mechanism; no second component library competing for spacing and colour |
| API | Express 5 | A layered monolith is the right size for this problem — no microservices, no gateway, no queues |
| Database | MongoDB + Mongoose | Document shape fits activities well; aggregation does the dashboard work |
| Validation | Zod | One schema library on both ends |
| Auth | JWT access + httpOnly refresh cookie, bcrypt | Access token in memory, never `localStorage` |
| Tests | Vitest + Supertest + mongodb-memory-server | A real database per suite; mocking Mongoose would test the mock |
| Logging | pino | Structured, with credentials redacted at the logger |

## Architecture

```
React SPA (Vite · Router · TanStack Query · Axios · Tailwind)
   │  REST · JWT Bearer · /api/v1 · httpOnly refresh cookie
   ▼
Express API   Routes → Middleware → Controllers → Services → Mongoose
   │          services/external/ ← every server-to-server call
   ▼
MongoDB Atlas   2dsphere · aggregation pipelines · one transaction
```

The full technical design is [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
(v5.2, frozen). Working rules for contributors — including the ones an AI
assistant must follow — are in [`CLAUDE.md`](CLAUDE.md).

**Every secret lives on the server.** The browser holds no database string, no
Cloudinary key, no Twilio credential and no AI key. The React bundle contains
exactly one configuration value: `VITE_API_URL`.

## Local setup

**Prerequisites:** Node (see [`.nvmrc`](.nvmrc)) and a MongoDB instance — a
local `mongod` or a free Atlas M0 cluster.

```bash
git clone <repo-url> outly
cd outly

# API
cd server
npm install
cp .env.example .env          # then fill it in — see the table below
npm run dev                   # http://localhost:5000

# Web, in a second terminal
cd ../client
npm install
cp .env.example .env
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173 — the home page shows live `db` status fetched from
`GET /api/v1/health`. Stop the API and the page renders its error state.

**Emails in development.** Without `SMTP_*` set, the API does not send mail — it
writes each message to its terminal instead. Register, then copy the
verification link from the `npm run dev` output. Production refuses to boot
without SMTP.

**An admin account.** Admins are never self-service:

```bash
cd server
npm run create-admin -- --email you@example.com --name "Your Name"
```

It prints a generated password once. Change it through *Forgot password*.

Generate the two JWT secrets with `openssl rand -base64 48`. They must differ
from each other and each be at least 32 characters; `config/env.js` refuses to
boot otherwise.

### Environment variables

`server/.env` — full list and phase annotations in
[`server/.env.example`](server/.env.example).

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `development` · `test` · `production` |
| `PORT` | yes | defaults to 5000 |
| `MONGODB_URI` | yes | local `mongod` or Atlas |
| `JWT_ACCESS_SECRET` | yes | ≥ 32 chars, must differ from the refresh secret |
| `JWT_REFRESH_SECRET` | yes | ≥ 32 chars |
| `BCRYPT_SALT_ROUNDS` | — | default 12 |
| `CLIENT_URL`, `CORS_ORIGINS` | — | `CORS_ORIGINS` is the allowlist and wins when set |
| `COOKIE_SECURE`, `COOKIE_SAMESITE` | — | must be `true` / `none` in production |
| `SMTP_*`, `EMAIL_FROM` | Phase 1 | Nodemailer |
| `CLOUDINARY_*` | Phase 4 | image upload |
| `AI_*` | Phase 5 | `AI_ENABLED=false` is a hard kill switch |
| `TWILIO_*`, `SMS_*` | Phase 6 | `SMS_ENABLED=false` by default |
| `RATE_LIMIT_*`, `LOG_LEVEL` | — | sensible defaults |

`client/.env` holds `VITE_API_URL` and nothing else. Vite inlines every `VITE_*`
value into the browser bundle, so **a secret with a `VITE_` prefix is a
published secret.**

## Scripts

| Location | Command | Does |
|---|---|---|
| `server` | `npm run dev` | API with hot reload |
| `server` | `npm start` | production start |
| `server` | `npm test` | Vitest against mongodb-memory-server |
| `server` | `npm run lint` | ESLint |
| `server` | `npm run migrate:organizers` | dry run of the §7 organizer migration; add `-- --apply` to write |
| `server` | `npm run create-admin -- --email …` | create a verified admin, or promote an existing account |
| `server` | `npm run create-indexes` | build schema indexes — required in production, where `autoIndex` is off |
| `client` | `npm run dev` | Vite dev server |
| `client` | `npm run build` | production bundle to `dist/` |
| `client` | `npm run lint` | ESLint |

`npm run seed` and `npm run reconcile` are registered placeholders; they land in
Phases 2 and 3.

## API

All routes are under `/api/v1`, with one envelope:

```json
{ "success": true,  "data": { }, "meta": { "page": 1, "limit": 12, "total": 84, "totalPages": 7 } }
{ "success": false, "error": { "code": "SOLD_OUT", "message": "...", "details": { } } }
```

Live today:

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register` · `login` · `refresh` · `logout` · `verify-email` · `resend-verification` · `forgot-password` · `reset-password` · `GET /auth/me` · `PATCH /auth/password` |
| Profile | `PATCH /users/me` |
| Organizer | `GET` / `POST /organizer/request` |
| Admin | `GET /admin/organizer-requests` · `PATCH /admin/organizer-requests/:id/approve` · `/reject` |

The full 44-endpoint contract is §19 of the architecture document.

## Data models

Five, all shipping inside the MVP: **User** · **Category** · **Activity** ·
**Booking** · **Review**. `User` exists today; the rest arrive in Phases 2–6.

## Testing

```bash
cd server && npm test
```

Vitest drives the exported Express app in-process through Supertest against a
real in-memory MongoDB. No test ever contacts Twilio, Cloudinary, an SMTP server
or an AI provider — those are mocked at the `services/external/*` boundary.

The suite concentrates where a bug is expensive: the Phase 3 concurrency tests
(twenty simultaneous bookings for one seat), authorization boundaries, and
aggregation correctness.

## Development phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation & contract lock | **complete** |
| 1 | Auth · email verification · organizer approval · first deploy | built locally; deploy pending |
| 2 | Categories · activity read · search/filter/sort · seed | — |
| 3 | Booking · atomic capacity · integrity · completion job | — |
| 4 | Organizer · Cloudinary · dashboards · aggregation | — |
| 5 | "I'm bored" discovery · AI refinement | — |
| 6 | Notifications · Twilio SMS · Reviews | — |
| H | Hardening · final deploy | — |

## Known limitations and future work

Recorded deliberately — each is a trade-off that was chosen, not an oversight.

- **Free activities only.** `price` must be `0`, enforced server-side.
  `unitPrice`, `totalPrice` and `paymentStatus` exist as seams; a real payment
  gateway is Phase 7.
- **Refresh-token rotation is deferred.** Rotation needs a stored hash and a
  write on every refresh; single-session `tokenVersion` revocation is sufficient
  for the MVP. Rotation and replay detection are Phase 8.
- **City-string filtering, not radius search.** Coordinates are stored correctly
  as GeoJSON with a `2dsphere` index from day one, so `$geoNear` and a map are a
  query-layer change in Phase 8 rather than a migration.
- **AI explanations degrade to templates.** The deterministic scorer always
  ranks; the AI only explains. With `AI_ENABLED=false`, or on a timeout, or on a
  malformed response, templated explanations are generated from the score
  components — so the feature never has a broken state.
- **SMS can fail silently and that is by design.** Notifications are dispatched
  after the response and individually wrapped. A booking must never fail because
  a provider is unavailable.
- **Phone numbers are not OTP-verified**, so SMS content is limited to
  non-sensitive transactional detail — never a link or a token.
- **Reconciliation is a script, not a cron job.** `npm run reconcile` repairs
  counter drift and doubles as standing evidence that the concurrency design
  holds.
