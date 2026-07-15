# Serie A 2026/27 · TV Audience Tracker

A webapp for the Serie A 2026/27 calendar (seeded from the `rawData` sheet of
the provided workbook): browse all 380 fixtures, record results and DAZN/Sky
audience as the season unfolds, and generate a calendar page branded with the
colors and crests of any teams you select.

## Stack

Everything runs as a single Cloudflare Pages project — no separate server to
babysit:

- **client/src** — Vite + React + Tailwind CSS v4, with `react-router` for the
  home page and per-team-selection branded calendar pages.
- **client/functions** — Cloudflare Pages Functions (the API): fixtures,
  teams, and GitHub-OAuth-based sign-in, all deployed alongside the frontend.
- **client/migrations** — SQL schema + seed data for Cloudflare D1
  (SQLite-compatible), which is where fixtures/results/audience actually live.
- Anyone can view the calendar; only GitHub accounts listed in
  `ALLOWED_GITHUB_LOGINS` (a Cloudflare env var, see setup below) can edit
  results/audience. Sign-in is a normal "Sign in with GitHub" button — no
  tokens to paste or lose, works the same on any device.
- Club crests are generated shield badges (`scripts/generate-crests.mjs`)
  built from each club's real primary/secondary colors — this dev sandbox has
  no outbound access to fetch actual crest artwork. Drop real PNG/SVG logos
  into `client/public/crests/<team-slug>.svg` (see `client/src/data/teams.json`
  for slugs) to replace them; no code changes needed.

## One-time setup (all via web dashboards, no CLI required)

Do these once, in order. After this, every merge to `main` redeploys
automatically — nothing else to run.

### 1. Create a Cloudflare Pages project

1. Sign up free at [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
3. Build settings:
   - **Root directory:** `client`
   - **Build command:** `npm install && npm run build`
   - **Build output directory:** `dist`
4. Deploy. You'll get a URL like `https://serie-a-tv-audience.pages.dev` —
   copy it, you need it in the next step.

### 2. Create a GitHub OAuth App (this is what "Sign in with GitHub" uses)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL:** your `pages.dev` URL from step 1.
3. **Authorization callback URL:** `<your pages.dev URL>/api/auth/callback`.
4. Create it, then **Generate a new client secret** — copy both the Client ID
   and the Client Secret now (the secret is shown once).

### 3. Create the D1 database and load the schema

1. **Workers & Pages → D1 → Create database** → name it
   `serie-a-tv-audience`.
2. Open it → **Console** tab → paste the entire contents of
   `client/migrations/0001_init.sql` → Run. This creates the `fixtures` table
   and loads all 380 fixtures.

### 4. Bind the database to the Pages project

Pages project → **Settings → Functions → D1 database bindings → Add binding**:
- Variable name: `DB`
- D1 database: `serie-a-tv-audience`

### 5. Set environment variables

Pages project → **Settings → Environment variables** (set for Production;
add to Preview too if you want it):

| Variable | Value |
|---|---|
| `GITHUB_CLIENT_ID` | from step 2 |
| `GITHUB_CLIENT_SECRET` | from step 2 — click "Encrypt" |
| `SESSION_SECRET` | any long random string you make up once — click "Encrypt" |
| `ALLOWED_GITHUB_LOGINS` | your GitHub username (comma-separate for more than one editor) |

### 6. Redeploy once

Pages project → **Deployments** → **Retry deployment** on the latest one, so
it picks up the bindings/env vars you just added. From now on, every merge to
`main` triggers this automatically — that's the whole update workflow.

Visit your `pages.dev` URL, click **Sign in to edit**, authorize with GitHub,
and confirm you can edit a score.

## Running locally (optional, for development)

```bash
cd client
npm install
npm run dev              # UI only, fast iteration, no API/DB
# or, to test the full stack (API + local D1) before pushing:
npm run db:migrate:local  # one-time: loads schema into a local D1 emulation
npm run preview:full      # builds and serves client + functions + local D1 together
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
