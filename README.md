# React Dashboard

File-management dashboard: metrics, uploads with live processing status, user
administration and settings, behind role-aware protected routes.

React 19 · TypeScript · Vite · Redux Toolkit · React Router 7 · Axios · Recharts ·
TanStack Virtual.

---

## Running it

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE_URL
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck (`tsc -b`) then production build |
| `npm run preview` | Serve the built output |
| `npm run lint` | oxlint |

---

## Sign-in flow

```
        ┌─────────┐  "Create account"   ┌────────────┐
  /  →  │ /login  │ ──────────────────► │ /register  │
        │         │ ◄────────────────── │            │
        └────┬────┘   "Login"           └──────┬─────┘
             │                                 │
             └──────────► /dashboard ◄─────────┘
```

The app always opens on **`/login`** — any unauthenticated URL redirects there,
carrying where you were headed so sign-in returns you to it.

**`/register`** collects Organization Name, Your Name, Email and Password. It
creates the workspace *and* its first user in one call, and because that call
returns a signed-in session it goes straight to `/dashboard` — no bouncing back
to a login form you've just filled in.

The account that creates a workspace becomes its **Owner** — the only role
holding `tenant:delete`. Validation runs client-side first (required fields, email
format, 8-character minimum) so obvious mistakes don't cost a round trip; a
duplicate email comes back from the server as a 409 and is pinned to the email
field rather than shown as a generic form error.

Both pages redirect an already-authenticated visitor to the dashboard.

---

## Authentication: mock now, real API later

The backend `/auth/*` endpoints don't exist yet, so the app ships with a
stand-in login. Sign in with:

```
admin@test.com / admin123
```

Or create your own through **Create account** — registered accounts persist in
`localStorage` (key `rd.auth.mockAccounts`) and can sign in again afterwards,
just as they would against a real backend. Signing out leaves them intact; clear
that key to reset.

Three more built-in accounts exist so each row of the access matrix can be exercised —
`owner@test.com` / `owner123`, `editor@test.com` / `editor123`,
`viewer@test.com` / `viewer123`. All four are listed under the sign-in form and
clicking one fills the fields. They live in one array in
[`auth.mock.ts`](src/api/services/auth.mock.ts) and can be deleted freely.

### Swapping in the real API

**Set `VITE_AUTH_MODE=api`.** That is the entire change — no code edits.

It works because the app never imports a concrete implementation. It talks to the
[`AuthApi`](src/api/services/auth.contract.ts) interface, and
[`authProvider.ts`](src/api/services/authProvider.ts) picks which of the two
implementations satisfies it. Both are declared `satisfies AuthApi`, so if the
real one and the mock ever drift apart, the build fails rather than the swap
surprising you at runtime.

Once the backend is live for good, delete
[`auth.mock.ts`](src/api/services/auth.mock.ts),
[`MockCredentialsHint.tsx`](src/components/auth/MockCredentialsHint.tsx) and the
mock branch in `authProvider.ts`. Nothing else references them.

### Why the mock is deliberately not a shortcut

It mints a **real JWT-shaped token** with a genuine `exp`, and installs its own
refresh handler through `setRefreshHandler()`. So the interceptor machinery —
proactive refresh before expiry, single-flight coalescing, request replay — all
runs for real against the mock instead of being bypassed. Bad credentials throw
the same 401 `ApiError` the real API produces, and every call takes ~400ms.

The intent is that switching to `api` changes where tokens come from and nothing
else about how the app behaves.

### Safety

`VITE_AUTH_MODE` unset defaults to **`mock` in development** and **`api` in
production builds** — a production bundle can't silently accept `admin123`
because someone forgot a variable.

The exclusion is compile-time, not just runtime: the flag is read straight from
`import.meta.env`, which Vite folds to a literal, so a default production build
drops the mock module from the output entirely. Verified — `admin@test.com`
does not appear anywhere in `dist/` unless you explicitly build with
`VITE_AUTH_MODE=mock`.

> **Only auth is mocked.** `/files`, `/metrics` and `/users` still call the real
> API, so those pages show an error until the backend is up. Say the word if you
> want stand-in data for them too.

---

## Pointing it at your API

**You only need to touch two places.**

1. **Paths** — [`src/api/endpoints.ts`](src/api/endpoints.ts). One object, every
   URL the app calls.
2. **Response shapes** — the `adapt*` functions in
   [`src/api/services/`](src/api/services/). Each is marked
   `── Adapt to your API here ──`. They already accept the common spellings
   (`accessToken`/`access_token`, `{items,total}` / `{data,meta.total}` / a bare
   array), so there's a good chance they work unchanged.

Nothing else in the app parses a raw payload.

### The contract it assumes

| Method | Path | Expects back |
|---|---|---|
| `POST` | `/auth/login` | `{ accessToken, refreshToken?, expiresIn?, user, tenant }` |
| `POST` | `/auth/register` | same as login — sends `{ organizationName, name, email, password }`, returns a signed-in session. `409` if the email is taken |
| `POST` | `/auth/refresh` | `{ accessToken, refreshToken?, expiresIn? }` |
| `POST` | `/auth/logout` | — |
| `GET` | `/auth/me` | `{ user, tenant }` |
| `GET` | `/files?page&pageSize&search&status&sort` | `{ items, page, pageSize, total, totalPages }` |
| `POST` | `/files` | the created file record (multipart, field name `file`) |
| `GET` | `/files/statuses?ids=a,b,c` | `{ items: [{ id, status, thumbnailUrl?, error? }] }` |
| `DELETE` | `/files/:id` | — |
| `GET` | `/metrics/summary` | `{ totalFiles, storageUsedBytes, activeUsers, jobsQueued, deltas? }` |
| `GET` | `/metrics/uploads-daily?days=30` | `[{ date: 'YYYY-MM-DD', count }]` |
| `GET` | `/users?page&pageSize&search` | paginated users |
| `POST` `PATCH` `DELETE` | `/users`, `/users/:id` | user records |
| `GET` `PATCH` | `/me/settings`, `/tenant` | settings / tenant records |

A file record is `{ id, name, sizeBytes, mimeType, status, thumbnailUrl?,
downloadUrl?, uploadedAt, uploadedBy? }` where `status` is
`pending | processing | done | failed`.

### CORS, if your API is on another origin

The client sends `withCredentials: true` (so a cookie-based refresh token works).
That means your API must reply with a **specific** origin, not `*`:

```
Access-Control-Allow-Origin: https://your-app-origin
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: authorization, content-type
```

`Access-Control-Allow-Origin: *` is rejected by the browser for credentialed
requests, and the symptom is a refresh that silently fails and logs the user out.

---

## How the pieces fit

### Transparent 401 handling

[`src/api/http.ts`](src/api/http.ts). Two layers:

- **Request interceptor (primary).** Before a request leaves, if the access token
  is within `VITE_TOKEN_REFRESH_SKEW_MS` of expiring, it is refreshed first and
  the *fresh* token is sent. Expiry is handled before the wire, so in normal use
  a 401 is never generated.
- **Response interceptor (safety net).** Covers what the first layer can't
  predict — a revoked token, clock skew, or an opaque (non-JWT) token whose
  expiry can't be read. On a 401 it refreshes once and replays the original
  request; the caller's promise resolves with the real response.

Refresh is **single-flight**: ten requests failing together produce one refresh
call that all ten wait on and then replay. Without that you get a refresh
stampede, and on APIs with rotating refresh tokens, a logout loop.

Only when the refresh token itself is dead does the app give up — it clears the
session, and the login page explains that the session expired rather than showing
a raw error.

> Keep `VITE_TOKEN_REFRESH_SKEW_MS` comfortably **below** your access-token
> lifetime. If the skew is longer than the token's life, every request looks
> "about to expire" and refreshes.

### State

**Redux Toolkit** for feature state — `files`, `uploads`, `users`, `metrics`,
`ui`. Components read what they need through the typed hooks in
[`src/app/hooks.ts`](src/app/hooks.ts), so nothing is threaded through props.

**Context for auth and tenant identity only**, as specified —
[`SessionProvider`](src/auth/SessionProvider.tsx) provides both from one session
response. No feature state lives in Context.

### Roles and access

Four roles, and an explicit capability table in
[`src/auth/roles.ts`](src/auth/roles.ts) that is the single source of truth:

| Role | View files | Upload / edit | Manage users | Delete tenant data |
|---|:--:|:--:|:--:|:--:|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✗ |
| Editor | ✓ | ✓ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ |

Permissions are **membership lookups, not rank comparisons**. Every gate asks
`can(role, 'users:manage')`; nothing asks "is this role admin or above". That is
what makes `tenant:delete` expressible at all — it belongs to Owner *alone*, so
any "and above" comparison would silently hand it to nobody or to everybody
senior. Changing who can do what is a one-line edit to `PERMISSIONS`, and every
guard, nav link and button follows automatically.

One extra capability not in the matrix: `tenant:settings` (renaming the
workspace) is grouped with the admin tier, since it sits beside user management
and is non-destructive.

Role *rank* survives for exactly one job — you may only grant or edit a role at
or below your own (`canAssignRole`). An Admin can promote someone to Admin but
cannot touch an Owner.

Two nested guards, deliberately separate:

- [`RequireAuth`](src/auth/RequireAuth.tsx) — not signed in → `/login`, with the
  attempted URL in location state so sign-in returns you there. While the session
  rehydrates it renders a spinner rather than redirecting, which is what stops
  the refresh-then-bounce flicker.
- [`RequireCapability`](src/auth/RequireCapability.tsx) — signed in but not
  permitted → the 403 page **rendered in place**, so the URL stays put and both
  the browser Back button and the page's own back action behave. The page names
  the missing capability and which roles hold it, read from the same table.

The sidebar filters its links with the same `can()` call the guards use, so a
link is never shown for a page that would immediately 403. Settings shows the
signed-in user their own granted/denied list, also read from `PERMISSIONS`, so it
can't drift from what is enforced.

If your API sends different role names, map them in `ROLE_ALIASES` in
[`src/api/services/auth.ts`](src/api/services/auth.ts) (`member` → `editor` is
already there). Unrecognised roles fall back to `viewer` — the least privileged,
never the most.

### File Manager

- **Drag and drop** with enter/leave depth counting, so the highlight doesn't
  flicker as the pointer crosses child elements. Click-to-browse and keyboard
  activation work too.
- **Progress** comes from Axios `onUploadProgress`; each upload is cancellable
  via `AbortController`. The batch bar is weighted by bytes, not file count.
- **Status badges** poll `/files/statuses` for rows that are still
  pending/processing, and the interval stops as soon as the last one reaches a
  terminal state.
- **Thumbnails**: an object URL gives an instant local preview while uploading;
  the server thumbnail takes over afterwards, with a graceful fallback when it
  doesn't exist yet or the URL has expired.
- **Virtualisation** kicks in above `VITE_VIRTUALIZE_THRESHOLD` (default 100)
  rows via TanStack Virtual. Below it, a plain list is simpler and faster.
  Verified: a 200-row page renders ~18 rows in the DOM.
- **Pagination is server-side.** `items` only ever holds the page the server
  returned; page and page-size controls change the request, never a client slice.

### Dashboard

Four stat tiles and one chart. The chart is a single-series area of files
uploaded per day: no legend (the title names the series), gap-filled so quiet
days aren't compressed out of the axis, only the peak directly labelled, a
crosshair tooltip, and a **"View as table"** twin so no value is reachable by
hover alone. Colours resolve from CSS custom properties at runtime
([`useChartTokens`](src/components/dashboard/useChartTokens.ts)) because SVG
presentation attributes don't resolve `var()` — which keeps the light/dark
palette in one place and lets the chart re-colour when the theme changes.

### Performance

The four signed-in pages are `React.lazy` split. The charting library is the
largest dependency and it now lives in the dashboard chunk, so the login screen
doesn't download it:

```
index          242 kB  (77 kB gzip)   ← initial
DashboardPage  338 kB  (96 kB gzip)   ← only on /dashboard
FileManagerPage 38 kB  (12 kB gzip)
```

---

## Notes / trade-offs

- **Token storage.** Tokens are persisted in `localStorage` so a reload keeps you
  signed in. If your threat model rules that out, have the API set the refresh
  token as an `httpOnly` cookie and leave `refreshToken` null — the refresh call
  already sends credentials, and no other change is needed.
- **"Delete tenant data" is read as "delete files"** — the tenant's data — which
  makes file deletion Owner-only. If it was meant to cover only destroying the
  whole workspace, and Admins should still be able to delete individual files,
  change the `canDelete` line in
  [`FileManagerPage`](src/pages/FileManagerPage.tsx) from `'tenant:delete'` to
  `'files:upload'` (or add a `files:delete` row to `PERMISSIONS`).
- **No tests yet.** The refresh interceptor's single-flight behaviour and the
  role guards are the two places worth covering first.
