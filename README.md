# Serie A 2026/27 · TV Audience Tracker

A webapp for the Serie A 2026/27 calendar (seeded from the `rawData` sheet of
the provided workbook): browse all 380 fixtures, record results, DAZN/Sky
audience and sponsorship activity as the season unfolds, and generate a
calendar page branded with the colors and crests of any teams you select.

All editing happens on the home page's full calendar - the per-team and
combined branded calendar pages (`/calendar/...`) are view-only. Picking
exactly one team shows a different, flatter layout instead of the two-team
combined view: every match in the season, one after another (no matchday
filter to page through), one row per match - date/time, a home or away icon,
the opponent, score and broadcasters - laid out in multiple columns once
there's room for it. The hamburger menu's **Fixtures** entry is where you get
to any of these views: **All teams →** goes back to the home page's full
calendar, **All sponsored teams →** jumps to a combined calendar of every
sponsored club, and the picker underneath builds a custom combination -
it only remembers clubs you've deliberately checked there, never
pre-selecting anything on its own. Using either of the two shortcut buttons
doesn't touch the picker's own checkboxes, so reopening the menu afterwards
still shows whatever (if anything) you'd actually picked into the picker.

On any branded calendar page, the header's club pills are toggles, not just
links: click one to add or remove that club from the current view (dimmed =
not currently included) - narrowing down to one switches to the single-team
layout, and the other clubs' pills stay put so you can add them back. Big
matches and derbies get an emphatic gradient bar + tinted background on their
row, with both DERBY and BIG labels shown together when a fixture is both.
A row of filter chips (Big matches, Derbies, Matchday sponsor, Player mascot,
Walkabout) narrows the fixtures shown down to matches meeting any of the
checked criteria - handy on the sponsored-teams view to jump straight to the
matches your activations actually happened at.

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
(380 fixtures loaded). Its ID is already in `client/src/lib/config.js` — you
don't need to create a sheet. Columns A-L (id, matchday, day, date, home,
away, homeScore, awayScore, daznAudience, skyAudience, kickoffTime,
updatedAt) were part of the original seed - `day` is kept in sync
automatically: editing a fixture's `date` from the app recomputes `day` from
the new date on every save, so it can't go stale even though it started as a
plain static value at seed time. The app also now reads/writes
columns M-P for newer fields — the app writes to these by cell position, so
it works with or without header labels, but for your own reference when you
open the sheet directly, add these labels to row 1 if you want them:

| Column | Label | Meaning |
|---|---|---|
| M | onSky | TRUE/FALSE — also broadcast on Sky (default off, DAZN-only) |
| N | addedTime1H | Added/injury time, first half (minutes) |
| O | addedTime2H | Added/injury time, second half (minutes) |
| P | daznSimulcastAudience | Audience for DAZN's multi-game simulcast slot, when applicable |
| Q | homeMatchdaySponsor | TRUE/FALSE — home club had a matchday sponsor activation at this match |
| R | homePlayerMascot | TRUE/FALSE — home club had a player mascot at this match |
| S | homeWalkabout | TRUE/FALSE — home club had a walkabout at this match |
| T | awayMatchdaySponsor | Same three, for the away club |
| U | awayPlayerMascot | |
| V | awayWalkabout | |
| W | isBigMatch | TRUE/FALSE — both clubs in this fixture are marked `bigClub` |
| X | isDerby | TRUE/FALSE — the two clubs in this fixture are each other's `derbyRival` |

The Q-V columns are only editable from the home page's **Sponsors** tab (per
matchday card), and only show checkboxes for whichever side of a fixture is a
club marked `sponsored` in the `teams` tab (see below). Whatever's checked
shows up as a small badge on that fixture everywhere it's displayed — home
page, combined calendars, single-team calendars — regardless of sign-in.

W-X aren't editable anywhere in the app - they're a read-only mirror of what
the `teams` tab's `bigClub`/`derbyRival` settings compute for that fixture,
written there so you can see/filter/reference it directly in the sheet
instead of only inside the app. They get refreshed automatically whenever
that fixture is edited from any of the home page's tabs, and you can also
click **Sync big match / derby tags to sheet** (top of the home page, signed
in) to write them for every currently-loaded fixture in one go - useful right
after changing a club's `bigClub`/`derbyRival` in Settings, so historical
rows update immediately instead of waiting for their next edit.

### Team settings tab (name/short/colours/sponsorship)

The hamburger menu's **Settings** panel edits a second tab, named `teams`,
that doesn't exist yet in the seeded sheet — add it yourself:

1. Add a new sheet tab named exactly `teams`.
2. Put this header row in row 1: `slug`, `name`, `short`, `primary`,
   `secondary`, `crestUrl`, `sponsored`, `matchdaySponsors`, `playerMascots`,
   `walkabouts`, `bigClub`, `derbyRival`.
3. Select cell A2 and paste this block (one row per club, tab-separated —
   copy it as-is and Sheets will split it into columns automatically):

```
atalanta	Atalanta	ATA	#1E71B8	#000000
bologna	Bologna	BOL	#8B1D2C	#1B3E7A
cagliari	Cagliari	CAG	#C8102E	#00205B
como	Como	COM	#0066B3	#FFFFFF
fiorentina	Fiorentina	FIO	#482E92	#FFFFFF
frosinone	Frosinone	FRO	#FFD400	#003DA5
genoa	Genoa	GEN	#C8102E	#00205B
inter	Inter	INT	#003DA5	#000000
juventus	Juventus	JUV	#000000	#FFFFFF
lazio	Lazio	LAZ	#87D8F7	#FFFFFF
lecce	Lecce	LEC	#FFD100	#C8102E
milan	Milan	MIL	#FB090B	#000000
monza	Monza	MON	#C8102E	#FFFFFF
napoli	Napoli	NAP	#12A0D7	#003DA5
parma	Parma	PAR	#FFD400	#003DA5
roma	Roma	ROM	#8E1F2F	#F0BC42
sassuolo	Sassuolo	SAS	#00A650	#000000
torino	Torino	TOR	#7B1E3A	#FFFFFF
udinese	Udinese	UDI	#000000	#FFFFFF
venezia	Venezia	VEN	#FF6600	#000000
```

`slug` is the join key back to `client/src/data/teams.json` — don't edit it.
Everything else is fair game from the Settings panel once you're signed in:
rename a club, change its short code, primary/secondary colours or crest, and
flip **We sponsor this team** on to reveal three counters — matchday
sponsors, player mascots,
and walkabouts — for tracking your company's in-stadium sponsorship activity
at that club. Leave `sponsored`/the three counts blank for clubs you don't
sponsor. Every edit here shows up immediately across the whole app (fixture
rows, crests, branded pages) for anyone with the app open in a browser tab —
no reload needed — though it's a one-way sync: someone else's browser only
picks up your change the next time they load the app, there's no live
push between devices.

`bigClub` and `derbyRival` drive automatic match highlighting - neither is
stored per fixture, both are worked out live from the two teams involved:
- **Big match**: flip `bigClub` on for any club considered a marquee side:
  whenever two `bigClub` clubs play each other, that fixture is a big match.
- **Derby**: pick a `derbyRival` for a club (a dropdown of every other club in
  Settings) and a fixture only counts as a derby between those two *specific*
  clubs - e.g. Roma's rival set to Lazio means Roma-Lazio is a derby, but
  Roma-Milan isn't, even if Milan has its own derby rival set elsewhere.

Both show up as a small coloured left border plus a DERBY/BIG label on the
fixture, everywhere it's displayed.

`crestUrl` replaces the generated placeholder shield with a real badge.
Editing it from the Settings panel writes an `=IMAGE("url")` formula into the
cell, so you'll actually see the crest rendered right there in the sheet, not
just a link. You can also skip the app entirely and type `=IMAGE("url")`
into that cell yourself directly in Sheets - the app reads it back out either
way (a plain pasted URL with no formula also still works, it just won't show
a picture in the sheet itself). Either way it needs a **direct image URL**
(ending in `.svg`/`.png`/etc., something you can paste into a new browser tab
and see just the image) - the easiest source is Wikipedia: open the club's
crest file page, right-click the image → **Copy image address**. Leave it
blank to keep the generated placeholder for that club.

Note: Sheets' *other* "Insert image in cell" feature (Insert → Image → Image
in cell, picking a file to upload) is a different, more opaque mechanism -
Google doesn't expose a way to read that image's source back out through the
API at all (there's no field for it, confirmed via their own open issue
tracker), so that specific path can't work here. Stick to `=IMAGE("url")` or
a plain URL in the cell.

Renaming a club here is safe for existing fixtures: matching against the
`fixtures` tab's `home`/`away` text is keyed internally to each club's
original bundled name, not whatever you rename it to, so historical rows
keep resolving correctly either way.

## Standing Tiebreakers
If after all 38 games, two teams are tied on points for either first place or for 17th (the last safety spot), the outcome is decided by a single-legged play-off match. This match consists of 90 minutes of regulation time followed by penalties if necessary (no extra time). The game is to be held at a neutral venue, with the designated "home" team determined by the performance-based criteria listed below. In cases where there are at least three teams tied for one of these positions, a mini table is created using the same tiebreakers to determine which two teams will play in the decider. For ties concerning all other league positions, the following tiebreakers are applied:

    Head-to-head points
    Goal difference of head-to-head games
    Goal difference overall
    Higher number of goals scored
    Play-off game at a neutral venue if relevant to decide European qualification or relegation; otherwise by coin flip

The app can't simulate a play-off or a coin flip, so the **Standings** page
(hamburger menu → Standings) applies points, then the four tiebreakers above
in order, then falls back to alphabetical if a tie somehow survives all of
them - the same order at every matchday, not just the final table.

It's two views:
- A normal league table - played/won/drawn/lost, goals for/against/difference,
  points - with sponsored clubs given a subtle highlight.
- **Standing by matchday**: two line charts - cumulative points, and league
  position (1st at the top) - plotting every club in that club's own colour,
  from matchday 1 up to wherever the shared slider underneath is set; drag it
  back and forward and both redraw to that point in the season. Each line
  ends in that club's own crest instead of a plain dot, nudged apart just
  enough to stay readable when clubs are tied. Hover any line (or a row in
  the ranked list beside the charts, which always shows the exact
  top-to-bottom order at the slider's matchday) to highlight it across both
  charts and the list together.

## Dashboard

The hamburger menu's **Dashboard** (`/dashboard`) is for evaluating sponsorship
deals, not for following the season - it covers all 20 clubs (sponsored ones
pinned to the top of the table and dotted elsewhere), not just the ones
you've sponsored, since you need the numbers for clubs you're *considering* too.

Two audience figures are tracked, for two different kinds of deal:
- **Home audience** - only that club's home games. This is what an LED
  perimeter-board package buys, since those boards only exist at that club's
  own stadium.
- **Total audience** - home and away combined. This is what a jersey/kit
  partnership buys, since the badge is on screen wherever the club plays.

Both are DAZN + Sky combined (Sky's figure only counts on games also marked
`onSky`). **Added time** (average stoppage-time minutes per home game) is
tracked separately, unweighted by audience, for evaluating the cheaper
LED packages that only run during stoppage time.

**Simulcast handling**: when several games share an exact kickoff slot, DAZN
airs them as one program with a single shared `daznSimulcastAudience` figure
(see the fixtures sheet columns above) instead of - or alongside - each
game's own `daznAudience`. Counting both as-is would double-count the same
viewers across every game in the slot, so by default the dashboard ignores
`daznSimulcastAudience` entirely and uses only each game's own `daznAudience`.
Flipping on **Include simulcast audience** (top right of the page) instead
gives each game in a shared slot an even split of that slot's shared figure
(`daznSimulcastAudience ÷ number of games in the slot`), added on top - a
smart-but-approximate adjustment, off by default.

The page has a ranked bar chart (pick the metric from the dropdown) and a
sortable full-club table, both club-level; click a club anywhere on the page
to focus it, which narrows every section below to just that club's games
(click again, or its row again, to go back to league-wide).

Below that:
- **Season audience trend** - a line chart of average audience per matchday
  across the season (league-wide), with the focused club's own game each
  matchday overlaid as a second line, so you can see whether audience is
  rising or falling as the season goes on and how a club's own games track
  against that baseline.
- **Scheduling patterns** - average audience by day of week and by kickoff
  time (Serie A's own broadcaster picks these, so it's league-wide by
  default), plus a **heatmap** of every day+kickoff combination actually
  used so far (darker = higher average audience) with a sortable table
  underneath for the exact numbers.
- **Big match / derby audience premium** - average audience for regular
  games vs. big matches vs. derbies, so you can see the uplift a game's
  billing carries independent of which two clubs are playing.
- **Games also on Sky** - a simple share meter (a two-way split reads better
  as a percentage than a pie).
- **Sponsor activation audience** - focus a sponsored club to see a donut of
  how its audience-delivered total splits across activation types (matchday
  sponsor / player mascot / walkabout) - what those checkboxes on the home
  page's Sponsors tab actually delivered, not just how many times they were
  checked.
- **Top games by audience** - filter by club, home-only, and how many to
  show.

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

- Nothing currently planned - open an issue or just ask for the next thing.
