# Serie A 2026/27 · TV Audience Tracker

A webapp for the Serie A 2026/27 calendar (seeded from the `rawData` sheet of
the provided workbook): browse all 380 fixtures, record results and DAZN/Sky
audience as the season unfolds, and generate a calendar page branded with the
colors and crests of any teams you select.

## Stack

This is a plain static site — no server, no database to host, nothing that
can be blocked by a corporate proxy the way `workers.dev` was:

- **client/src** — Vite + React + Tailwind CSS v4, with `react-router` for the
  home page and per-team-selection branded calendar pages, built to
  `client/dist` and deployed to **GitHub Pages**.
- **Data** lives in a **Google Sheet**, not a database. The browser talks to
  it directly via the Google Sheets API: reads use a restricted, public API
  key (no sign-in needed just to browse); writes require "Sign in with
  Google" and only succeed for Google accounts that have Editor access to the
  Sheet — that permission check is Google Drive's own, not something this app
  has to enforce itself.
- **Auth** is Google Identity Services' client-side token flow — a popup,
  no backend, no secret, works identically on any device. The sign-in token
  lasts about an hour; after that, editing again just prompts a quick
  re-sign-in.
- Club crests are generated shield badges (`scripts/generate-crests.mjs`)
  built from each club's real primary/secondary colors — this dev sandbox has
  no outbound access to fetch actual crest artwork. Drop real PNG/SVG logos
  into `client/public/crests/<team-slug>.svg` (see `client/src/data/teams.json`
  for slugs) to replace them; no code changes needed.

I already created and seeded the Google Sheet in your Drive:
https://docs.google.com/spreadsheets/d/1h3ZN2H5_ISzLUCW_AtbP2nFSRoMf7htwL8PYYAtRq4o/edit
(380 fixtures loaded, columns: id, matchday, day, date, home, away, homeScore,
awayScore, daznAudience, skyAudience, kickoffTime, updatedAt). Its ID is
already in `client/src/lib/config.js` — you don't need to create a sheet.

## One-time setup

### 1. Turn on GitHub Pages

Repo → **Settings → Pages → Build and deployment → Source** → set to
**GitHub Actions**. That's it — `.github/workflows/deploy-pages.yml` builds
and deploys `client/` on every push to `main` from here on. Push anything (or
re-run the workflow from the **Actions** tab) to get the first deploy going;
it'll be live at `https://<your-github-username>.github.io/serie-a-tv-audience/`.

### 2. Share the Google Sheet

Open the Sheet linked above → **Share**:
- Set general access to **Anyone with the link → Viewer** (needed so the
  live site can read fixtures without anyone signing in).
- Then explicitly add yourself (and anyone else who should be able to edit)
  as **Editor** by email. This is the actual security boundary — only
  accounts you add as Editor here can successfully save changes through the
  app, no matter who signs in.

### 3. Google Cloud Console — one project, two credentials

Go to [console.cloud.google.com](https://console.cloud.google.com), create a
project (or use an existing one), then:

1. **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
2. **APIs & Services → OAuth consent screen**: User type **External**, fill
   in the required fields (app name, your email). Leave publishing status as
   **Testing** and add yourself (and any co-editors) under **Test users** —
   no Google review needed for personal use like this.
3. **APIs & Services → Credentials → Create credentials → API key.** Copy it.
   Once you know your `github.io` URL from step 1, come back and restrict
   this key: **Application restrictions → HTTP referrers**, add
   `https://<your-github-username>.github.io/*`; **API restrictions** →
   limit it to Google Sheets API.
4. **Create credentials → OAuth client ID** → Application type **Web
   application** → under **Authorized JavaScript origins** add
   `https://<your-github-username>.github.io` (origin only, no path, no
   trailing slash). Copy the **Client ID** — there's no client secret to
   handle at all with this flow.

(If Google prompts you to attach a billing account before enabling the API —
this happens on some newer Cloud projects even for free-tier usage — you can
attach one without it costing anything; Sheets API + OAuth sign-in as used
here stay within the free quota.)

### 4. Wire the credentials in

Send me the API key and the OAuth Client ID (neither is a secret — safe to
share) and I'll drop them into `client/src/lib/config.js` and push. Or edit
that file yourself:

```js
export const GOOGLE_API_KEY = '...';       // from step 3.3
export const GOOGLE_CLIENT_ID = '...';     // from step 3.4
```

Push to `main` — GitHub Pages redeploys automatically.

### 5. Test it

Visit the live URL, confirm the calendar loads with no sign-in. Click
**Sign in to edit**, authorize with your Google account, and confirm you can
save a score. If a teammate should also be able to edit, add their Google
account as a Sheet Editor (step 2) — no code or config change needed.

## Running locally (optional, for development)

```bash
cd client
npm install
npm run dev
```

Reads/writes still go straight to the real Google Sheet from your local
browser, so `npm run dev` needs the same credentials in `config.js` as
production — there's no separate local backend to run.

## Data storage

Fixtures/results/audience live in a Google Sheet, read and written directly
from the browser — no backend, no database to host, no hosting platform that
could get blocked by a network filter. See the original workbook
(`DASHBOARD`, `bigMatches`, `Coppa & Supercoppa` tabs) for reference data not
yet wired into the app.

## Roadmap

- Team/league performance dashboards (audience trends, big-match tracking).
