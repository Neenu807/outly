# First deploy — checklist

ARCHITECTURE §27, in the order that section prescribes. The last step is the
one that fails, and it only fails in production — which is why this happens at
the end of Phase 1 rather than the end of the project.

## 1. MongoDB Atlas

- [ ] Create an M0 cluster.
- [ ] Create a database user with **`readWrite` on `outly` only** — not an Atlas admin.
- [ ] Network access: allow Render's outbound IPs, or `0.0.0.0/0` for the free tier.
- [ ] Copy the connection string (`mongodb+srv://…/outly`).
- [ ] From your machine, with `MONGODB_URI` pointed at Atlas:
  ```bash
  cd server
  npm run create-indexes
  npm run create-admin -- --email you@example.com --name "Your Name"
  ```
  `autoIndex` is off in production, so without `create-indexes` the unique email
  index does not exist. Save the admin password it prints — it is shown once.

## 2. Email (an SMTP relay that offers port 2525)

> **Render's free tier blocks outbound SMTP on ports 25, 465 and 587** (since
> September 2025). A provider reachable only on those ports fails *silently in
> production*: the connection times out, the send is swallowed by design (§17),
> and nobody can verify an email. **Choose a relay that offers port 2525**, or
> pay for a Render instance type that lifts the restriction.
> This rules out Gmail, which offers only 465 and 587.

`email.service.js` needs no change for 2525: `secure` is true only on 465, and
Nodemailer upgrades the connection with STARTTLS on the others.

**Real delivery — Brevo** (free: 300 emails/day, no domain required)

- [ ] Verify a sender address under **Senders, domains & IPs → Senders**.
- [ ] Generate an SMTP key under **SMTP & API → SMTP**, and note the SMTP login
      shown there — it is not necessarily the account email.

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_USER=<SMTP login>
SMTP_PASS=<SMTP key>
EMAIL_FROM=Outly <the verified sender address>
```

`EMAIL_FROM` must be exactly the verified sender or Brevo rejects the message.
Without a domain of your own, expect some mail to land in spam.

**Testing only — Mailtrap Email Sandbox.** Every message is trapped in a web
inbox and *never reaches a real recipient*, so nobody but you can verify an
address. Credentials: **Sandboxes → your sandbox → Integration**.

```
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<sandbox username>
SMTP_PASS=<sandbox password>
EMAIL_FROM=Outly <no-reply@outly.app>
```

- [ ] Test locally first: put the five values in `server/.env`, keep
      `MONGODB_URI` pointed at the local database, register an account, and
      confirm the API logs `Email sent` rather than
      `Email NOT sent — SMTP is not configured`. While those values are set,
      local development sends real email on every registration.
- Production refuses to boot without `SMTP_HOST` and `SMTP_PORT`: verification
  gates booking, so a platform that cannot send it is one nobody can book on.

## 3. API on Render

- [ ] New → Blueprint → this repository. `render.yaml` defines the service.
- [ ] Fill in the `sync: false` values:
  | Key | Value |
  |---|---|
  | `MONGODB_URI` | the Atlas string |
  | `CLIENT_URL` | the Vercel URL, e.g. `https://outly.vercel.app` (no trailing slash) |
  | `CORS_ORIGINS` | the same Vercel URL |
  | `SMTP_*`, `EMAIL_FROM` | from step 2 |
- [ ] Deploy, then open `https://<service>.onrender.com/api/v1/health` in a
  browser and confirm `"db":"connected"`.
- Render's free tier sleeps after ~15 minutes idle; the first request then takes
  30–60 s. Decide how to handle that **before** a demo, not during it.

## 4. Client on Vercel

- [ ] New project → this repository, **root directory `client`**.
- [ ] Environment variable `VITE_API_URL` = `https://<service>.onrender.com/api/v1`.
  Vite inlines it at build time: changing it later means redeploying.
- [ ] `client/vercel.json` rewrites every path to `index.html`, so a hard refresh
  on `/profile` works instead of returning Vercel's 404.

## 5. Cookies and CORS — the step that fails

- [ ] Confirm Render has `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, and that
  `CORS_ORIGINS` matches the Vercel URL **exactly**.
- [ ] In an **incognito window**:
  - [ ] register → the verification email arrives → the link verifies
  - [ ] DevTools → Application → Cookies on the API domain shows `refreshToken`,
    `HttpOnly`, `Secure`, `SameSite=None`
  - [ ] **hard reload** — you are still signed in
  - [ ] visit `/profile` directly in the address bar — it loads
  - [ ] log out, reload — you are signed out
  - [ ] as the admin: approve a request, reject one with a reason
- [ ] Tag it: `git tag -a v0.2-auth -m "Phase 1: auth, verification, organizer approval, first deploy"`

If a login succeeds but a reload signs you out, it is almost always one of:
`SameSite` not `none`, `Secure` not set, `CORS_ORIGINS` not matching the origin
exactly, or a third-party-cookie block in the browser.
