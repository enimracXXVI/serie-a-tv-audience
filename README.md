# Serie A 2026/27 · TV Audience Tracker

A webapp for the Serie A 2026/27 calendar (seeded from the `rawData` sheet of the
provided workbook): browse all 380 fixtures, record results and DAZN / Sky
audience as the season unfolds, and generate a calendar page branded with the
colors and crests of any teams you select.

## Stack

- **server/** — Express API backed by SQLite (`better-sqlite3`). Fixtures are
  seeded automatically into `server/data/season.sqlite` on first boot from
  `server/data/fixtures.json`. All edits (results, DAZN/Sky audience) are
  persisted there.
- **client/** — Vite + React + Tailwind CSS v4, with `react-router` for the
  home page and per-team-selection branded calendar pages.
- Club crests are generated shield badges (`scripts/generate-crests.mjs`) built
  from each club's real primary/secondary colors — this sandbox has no
  outbound access to fetch actual crest artwork. Drop real PNG/SVG logos into
  `client/public/crests/<team-slug>.svg` (see `server/data/teams.json` for
  slugs) to replace them; no code changes needed.

## Running locally

```bash
npm run install:all   # installs server + client deps
npm run dev            # runs API on :4000 and the webapp on :5173 (proxied)
```

Open the URL Vite prints (typically http://localhost:5173).

## API

- `GET /api/teams` — team metadata (name, crest slug, colors).
- `GET /api/fixtures?teams=slug1,slug2` — fixtures, optionally filtered to
  matches involving any of the given team slugs.
- `PATCH /api/fixtures/:id` — update `kickoffTime`, `homeScore`, `awayScore`,
  `daznAudience`, `skyAudience` (send only the fields you want to change).

## Data storage

Fixtures/results/audience live in a SQLite file inside `server/data/`, not in
Google Sheets — this keeps editing fully inside the webapp (no external
credentials to manage) while staying trivial to query for future dashboards.
See the original workbook (`DASHBOARD`, `bigMatches`, `Coppa & Supercoppa`
tabs) for reference data not yet wired into the app.

## Roadmap

- Team/league performance dashboards (audience trends, big-match tracking).
