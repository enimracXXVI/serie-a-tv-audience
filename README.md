# Serie A 2026/27 · TV Audience Tracker

A webapp for the Serie A 2026/27 calendar (seeded from the `rawData` sheet of
the provided workbook): browse all 380 fixtures, record results and DAZN/Sky
audience as the season unfolds, and generate a calendar page branded with the
colors and crests of any teams you select.

## Stack

Everything runs as a single Cloudflare Worker — no separate server to babysit:

- **client/src** — Vite + React + Tailwind CSS v4, with `react-router` for the
  home page and per-team-selection branded calendar pages, built to
  `client/dist`.
- **client/worker** — the Worker entry point (`index.js`) and API routes
  (fixtures, teams, GitHub-OAuth sign-in). It serves the built frontend via a
  static-assets binding and handles everything under `/api/*` itself.
- **client/migrations** — SQL schema + seed data for Cloudflare D1
  (SQLite-compatible), which is where fixtures/results/audience actually live.
- Anyone can view the calendar; only GitHub accounts listed in
  `ALLOWED_GITHUB_LOGINS` (an env var, see setup below) can edit
  results/audience. Sign-in is a normal "Sign in with GitHub" button — no
  tokens to paste or lose, works the same on any device.
- Club crests are generated shield badges (`scripts/generate-crests.mjs`)
  built from each club's real primary/secondary colors — this dev sandbox has
  no outbound access to fetch actual crest artwork. Drop real PNG/SVG logos
  into `client/public/crests/<team-slug>.svg` (see `client/src/data/teams.json`
  for slugs) to replace them; no code changes needed.

## One-time setup

Cloudflare's dashboard changes its layout/labels fairly often, so treat the
wording below as approximate — go by what each step is *for*, not the exact
button text. Do this once; after it's done, every merge to `main` redeploys
automatically.

### 1. Connect the repo (you've done this part)

**Create Application** (may also be labelled "Create" under Workers/Compute)
→ **Connect to Git** → select this repo. In the build configuration:

- **Path:** `client` (the app lives in this subfolder, not the repo root)
- **Build command:** `npm run build`
- **Deploy command:** leave as `npx wrangler deploy`
- **Environment variables:** skip for now, added in step 4

Click through to create it. The very first build will fail — that's expected,
it needs the D1 database from step 2 first.

### 2. Create the D1 database and load the schema

1. Find **D1** in the Cloudflare sidebar (usually under a Storage/Databases
   section) → **Create database** → name it `serie-a-tv-audience`.
2. Open it → find its **Console** (a place to run raw SQL) → paste the entire
   contents of `client/migrations/0001_init.sql` → run it. This creates the
   `fixtures` table and loads all 380 fixtures.
3. On the database's overview page, copy its **Database ID**.

### 3. Wire the database into the repo

Open `client/wrangler.toml` and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`
with the ID you copied, then commit and push to `main`. Bindings for
`wrangler deploy` are declared in this file — once it has the real ID, the
next deploy will connect the Worker to the database automatically, no extra
dashboard step needed.

### 4. Create a GitHub OAuth App (this is what "Sign in with GitHub" uses)

By now the project has a live URL (something like
`https://serie-a-tv-audience.<your-subdomain>.workers.dev` — check the
Cloudflare project page for the exact one).

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL:** that live URL.
3. **Authorization callback URL:** `<that live URL>/api/auth/callback`.
4. Create it, then **Generate a new client secret** — copy both the Client ID
   and the Client Secret now (the secret is shown once).

### 5. Set environment variables

On the project → its environment variables settings (the same kind of
"Environment variables" section you saw when creating it, now editable in
project settings):

| Variable | Value |
|---|---|
| `GITHUB_CLIENT_ID` | from step 4 |
| `GITHUB_CLIENT_SECRET` | from step 4 — mark it secret/encrypted if offered |
| `SESSION_SECRET` | any long random string you make up once — mark it secret |
| `ALLOWED_GITHUB_LOGINS` | your GitHub username (comma-separate for more than one editor) |

Redeploy (retry the latest deployment, or just push anything) so the
variables take effect.

Visit the live URL, click **Sign in to edit**, authorize with GitHub, and
confirm you can edit a score.

## Running locally (optional, for development)

```bash
cd client
npm install
npm run dev              # UI only, fast iteration, no API/DB
# or, to test the full stack (API + local D1) before pushing:
npm run db:migrate:local  # one-time: loads schema into a local D1 emulation
npm run preview:full      # builds and serves the Worker + local D1 together
```

## API

- `GET /api/teams` — team metadata (name, crest slug, colors).
- `GET /api/fixtures?teams=slug1,slug2` — fixtures, optionally filtered to
  matches involving any of the given team slugs. Public, read-only.
- `PATCH /api/fixtures/:id` — update `kickoffTime`, `homeScore`, `awayScore`,
  `daznAudience`, `skyAudience`. Requires a signed-in session cookie from an
  allow-listed GitHub account.
- `GET /api/auth/login`, `GET /api/auth/callback`, `GET /api/auth/me`,
  `POST /api/auth/logout` — GitHub OAuth sign-in.

## Data storage

Fixtures/results/audience live in Cloudflare D1 (SQLite-compatible), not in
Google Sheets and not in a self-hosted server — this keeps the whole app on
one free, git-connected platform with nothing to patch or restart. See the
original workbook (`DASHBOARD`, `bigMatches`, `Coppa & Supercoppa` tabs) for
reference data not yet wired into the app.

## Roadmap

- Team/league performance dashboards (audience trends, big-match tracking).
