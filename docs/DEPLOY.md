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

## 2. Email (Mailtrap or any SMTP relay)

- [ ] Create an SMTP inbox and note host, port, user and password.
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
