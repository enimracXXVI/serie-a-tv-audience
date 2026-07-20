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
there's room for it. The hamburger menu's **Fixtures** entry takes you
straight back to the home page (same as Standings/Dashboard going straight
to their own page - no submenu). Right under the home page's own header,
three pills get you everywhere from there: **All teams** (the page you're
already on), **Sponsored teams →** (a combined calendar of every sponsored
club), and **Build calendar**, which expands the club picker inline on the
page. The picker only remembers clubs you've deliberately checked there,
never pre-selecting anything on its own - using the **Sponsored teams**
shortcut doesn't touch the picker's own checkboxes, so expanding **Build
calendar** afterwards still shows whatever (if anything) you'd actually
picked.

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

These TRUE/FALSE columns accept a real checkbox cell or plain text - "TRUE",
"true", or "True" (with or without stray whitespace) all count as checked;
anything else (including a blank cell) counts as unchecked. Handy to know
when pasting historical data by hand rather than using the app's own
checkboxes, e.g. into a past-season archive tab (see below).

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

## Adding fixtures from the app

Serie A's 380 fixtures were pre-seeded into the sheet all at once at the
start of the season - that's still the fastest way to bulk-load a whole
schedule, and always available: paste more rows directly into the `fixtures`
tab whenever you want. But you don't have to go to the sheet for a one-off:
signed in on the home page, **Add fixture** (next to **Sync big match / derby
tags**) opens a small form - matchday, home club, away club, date, kickoff
time - that appends a single new row without leaving the app. The matchday
number stays filled in after each add, so adding several fixtures for the
same round is just: submit, pick the next two clubs, submit again.

## Past seasons

The **Standings** and **Fixtures** (home) pages have a season dropdown next
to their header, defaulting to the current, live 26/27 season. Past seasons
are read-only archives, not sheet-editable settings - configured in
`client/src/lib/seasons.js`, a small hardcoded list rather than another
Settings panel, since this changes at most once a year:

```js
export const SEASONS = [
  { label: '26/27', tab: null },
  { label: '25/26', tab: 'fixtures_25_26' },
  { label: '24/25', tab: 'fixtures_24_25' },
];
```

`tab: null` means "the current season" - it reads the live, editable
`fixtures` tab exactly like every page already does. Any other entry points
at a separate tab with **the exact same header row as `fixtures`** (columns
A-X above: id, matchday, day, date, home, away, homeScore, awayScore,
daznAudience, skyAudience, kickoffTime, updatedAt, onSky, addedTime1H,
addedTime2H, daznSimulcastAudience, homeMatchdaySponsor, homePlayerMascot,
homeWalkabout, awayMatchdaySponsor, awayPlayerMascot, awayWalkabout,
isBigMatch, isDerby). Neither archive tab exists yet in the seeded sheet -
create `fixtures_25_26` and `fixtures_24_25` yourself (header row + past
results pasted in) for last season and the one before it. Every season
listed in `SEASONS` is shown in the dropdown regardless of whether its tab
exists, so only add an entry once the matching tab is there with data in
it - picking one whose tab is missing or malformed shows a load error
instead of data.

Selecting a past season switches Standings/Fixtures to show that season's
data, view-only - no editing controls (Add fixture, Sync tags, score/audience
edit tabs) appear, since these tabs are never written to by the app. Adding a
future season later is the same pattern: add a tab with that header row, add
one entry to `SEASONS`.

The table and charts on Standings (and every per-club section on the
Dashboard - see below) compute a past season's own club list from whoever
actually appears in its fixtures, not from the current 20-club roster - a
club that's been promoted or relegated since then still gets a correct
record and shows up everywhere it should for the season it actually played
in. Don't add a club to the `teams` tab just to make a past season display
correctly - anything in `teams` is treated as part of the *current* Serie A
season everywhere else in the app (team pickers, the Dashboard's Focus
club dropdown for the current season, etc.), so a club there that isn't
actually playing this season would incorrectly get offered as a current
one. Use the `pastTeams` tab instead (below) for that club's branding.

### Branding for clubs not in the current roster (`pastTeams` tab)

By default, a club that's not in the current 20-club roster gets a plain
monogram badge and a neutral grey line/bar colour wherever it shows up -
correct numbers, generic look. To give it a real crest and colours instead,
add a `pastTeams` tab (doesn't exist in the seeded sheet - add it yourself)
with header row: `name`, `short`, `crestUrl`, `primary`, `secondary`. `name`
must match **exactly** how that club appears in an archive fixtures tab's
`home`/`away` columns (this tab is keyed by name, not a slug, since name is
the only thing available to match a fixture against). Managed from the
hamburger menu's **Settings** panel, same `=IMAGE("url")`-or-plain-URL rule
for `crestUrl` as the main `teams` tab.

This tab is also the right place for a club that's *about* to be current -
freshly promoted, fixtures already being added for the new season, but you
haven't updated `teams.json` yet (see below) - it's consulted as a fallback
for any club not found in the current roster, regardless of whether that's
because it's no longer current or not yet current.

### Sponsored / big-match / derby designations per past season (`seasonTeamAttributes` tab)

**Sponsored**, **big club**, and **derby rival** in the main **Team
settings** panel are global, current-season-only flags - whatever they say
today is what they say, full stop. That's wrong for a past season: a club
sponsored in 24/25 isn't necessarily sponsored now, or vice versa, and that
must not silently flip to "sponsored in every season" or "never sponsored in
the past" just because today's Settings say so.

Add a `seasonTeamAttributes` tab (doesn't exist in the seeded sheet - add it
yourself) with header row: `id`, `season`, `name`, `sponsored`, `bigClub`,
`derbyRival`.

- `id` - always `season::name` (e.g. `24/25::AS Roma`) - the app fills this
  in for you when you save from Settings; only worth knowing if you're
  pasting rows directly.
- `season` - must match a label in `SEASONS` (`client/src/lib/seasons.js`),
  e.g. `24/25`.
- `name` - the club's fixture-matching text, same convention as `pastTeams`.
- `sponsored`, `bigClub` - TRUE/FALSE (same tolerant parsing as `onSky` -
  a real checkbox or plain "TRUE"/"true" text both work).
- `derbyRival` - another club's `name` (not a slug) - whichever club counts
  as this one's derby rival *for that season*.

A club with **no row** for a given season shows as not sponsored, not a big
club, with no derby rival for that season - there's no fallback to the live
`teams` tab, by design. Managed from the hamburger menu's **Settings** panel
(a new **Past-season sponsorship / big match / derby** section, below **Past-
season clubs**): pick an archive season, and every club that actually played
it gets an expandable row with the same three fields as the main Team
settings panel, except scoped to that season only. The live season is never
shown here - keep using **Team settings** for that, exactly as before.

The Dashboard also has a season dropdown, same as Standings/Fixtures -
switching it changes every section on the page (stat tiles, ranked bar
chart, sortable table, season trend, scheduling patterns, top games, and
the **Focus club** dropdown, which lists whoever actually played that
season) except one: the **Season comparison** card near the top always
shows all configured seasons side by side, regardless of which one is
currently selected elsewhere on the page - it's meant to answer "how does
this season compare", not "show me the season I happen to have picked".
It's split into two parts: **league-wide** totals (total audience, league
avg home audience) that are always shown, and, only once a club is
focused, that club's own **home avg audience** and **total audience**
(home + away combined) across the same seasons. Both use the same
`computeAllTeamMetrics` numbers the rest of the Dashboard already shows,
just run once per configured season. Clubs that played a season but
aren't in the current 20-club roster (promoted/relegated since) still
count towards that season's totals and show up everywhere on the page -
each archive season computes its own club list from whoever actually
appears in its fixtures, rather than assuming the current roster played
it too.

### Rolling over to a new season (promotion/relegation)

The current 20-club roster (`client/src/data/teams.json`, plus the bundled
crest SVGs in `client/public/crests/`) is a static file, not a sheet tab -
that's a deliberate simplicity trade-off, since it changes once a year at
most, and everything else in the app (team pickers, current-season Focus
club dropdowns, Settings) treats it as "this is who's playing this
season." When a new season starts with different clubs, there's no
self-service way around a small code change - here's the recommended
order:

1. **Before wiping the outgoing season's data**: for each of the 3
   relegated clubs, add a row to the `pastTeams` tab (name/short/crestUrl/
   primary/secondary - see above) if it doesn't have one already, so its
   branding is preserved once it's no longer in `teams.json`.
2. **Archive the just-finished season**: copy the live `fixtures` tab's
   contents into a new tab (e.g. `fixtures_26_27`), then clear the live
   `fixtures` tab and paste in the new season's fixture list. Add a
   matching entry to `SEASONS` in `client/src/lib/seasons.js` (new archive
   entry for the season that just ended, and update `CURRENT_SEASON`'s
   label to the new one - `tab: null` always stays on whichever entry is
   first/current).
3. **Update the roster**: edit `teams.json` to swap the 3 relegated slugs
   for the 3 promoted ones (colours, short code - real crest art if you
   have it, otherwise `scripts/generate-crests.mjs` can generate a
   placeholder shield from a club's primary/secondary colours). This step
   needs a code change/PR, same as any other edit to a bundled file.
4. Promoted clubs' `sponsored`/`bigClub`/`derbyRival` Settings all default
   to unset - revisit them in Settings once the roster's updated.

Steps 3-4 are the only ones that need an actual code change; steps 1-2 are
just sheet edits, same as any other season-to-season data entry. If this
manual step becomes a real yearly pain point, the roster itself could be
made sheet-editable (drop the static `teams.json` base list entirely, let
`teams` be the sole source of truth) - a bigger change than anything above,
worth doing only if the once-a-year code change actually turns out to be
a recurring annoyance rather than a five-minute task.

## Cup competitions (Coppa Italia / Champions League / Europa League / Conference League)

These don't fit the Serie A schema - no round-robin, no fixed 38-matchday
table, opponents aren't limited to the 20-club roster, and the broadcaster
isn't DAZN/Sky - so they live in four separate tabs instead of extending
`fixtures`/`teams`. None of these exist in the seeded sheet - add them
yourself if you want to track cup competitions:

**1. `competitions` tab** - which competitions exist and their logo, so a
fixture list/form can show a badge instead of a plain text label. Header
row: `value`, `label`, `logoUrl`. `value` is the stable key everything else
(`cupTeams.competition`, `cupFixtures.competition`) points at - don't rename
it once you've used it elsewhere. Paste this seed block into A2 to start
with the four you'd expect (`logoUrl` blank, fill in from Settings):

```
CoppaItalia	Coppa Italia
ChampionsLeague	Champions League
EuropaLeague	Europa League
ConferenceLeague	Conference League
```

If this tab doesn't exist yet (or is empty), the app falls back to those
same four with no logo, so everything else below still works without it -
add it whenever you want logos, not before. Managed from Settings, same
`=IMAGE("url")`-or-plain-URL rule as crests.

**2. `cupTeams` tab** - the opponents you'll face in these competitions
(a Serie B side in an early Coppa Italia round, any European club in a UEFA
tie), added as you go rather than pre-seeded like the 20 Serie A clubs.
Header row: `slug`, `name`, `short`, `crestUrl`, `primary`, `secondary`,
`competition` (matching a `value` from the `competitions` tab). Managed from
the hamburger menu's **Settings** panel (grouped by competition), same
`=IMAGE("url")`-or-plain-URL rule as the main teams tab's `crestUrl`.

**3. `broadcasters` tab** - a small reusable list so a cup fixture's
broadcaster shows a logo badge instead of a retyped name. Header row:
`name`, `logoUrl`. Also managed from Settings.

**4. `cupFixtures` tab** - the fixtures themselves. Header row: `id`,
`competition`, `round`, `ourClub`, `opponent`, `homeAway`, `date`,
`kickoffTime`, `ourScore`, `theirScore`, `audience`, `broadcaster`,
`addedTime1H`, `addedTime2H`, `season`. `ourClub` is a slug from the main
`teams` tab; `opponent` is a slug from `cupTeams`; `round` is free text
(`Round of 16`, `Group A`, whatever your competition calls it - there's no
fixed round list, a group stage and a knockout draw both just work);
`homeAway` is `home`, `away`, or `neutral`. There's no sponsor/mascot/
walkabout tracking here (that was a deliberate call - those activations are
tracked per Serie A home game only), just audience and added time.

`season` matches a label in `SEASONS` (`client/src/lib/seasons.js`), e.g.
`26/27` - a blank cell reads as the current season (a one-time fallback for
rows added before this column existed; the app always writes a real label
from now on). Unlike Serie A, cup fixtures for every season live in this one
tab rather than one tab per season - cup volume is small enough that a
separate archive tab per season would just be overhead.

The hamburger menu's **Cup competitions** page has a season dropdown, same
as Standings/Fixtures/Dashboard, filtering to whichever season's cup
fixtures you're looking at, grouped by competition and round, with the same
kind of expandable edit tabs as the main calendar (kickoff details; result,
added time, audience and broadcaster). **Signed in, on the current season**,
**Add fixture** opens a form to create a new cup fixture without touching
the sheet directly - pick the competition, round, your club, and an opponent
(or add a brand new one inline, right there in the form, if this is the
first time you're facing them); it's still fine to add a cup fixture by
pasting a row into the sheet directly instead, whichever's quicker for what
you're doing. **Past cup seasons are frozen** - no Add fixture, no editing
an existing row - same precedent as Serie A's archive tabs. Backfilling an
already-completed cup season (a past Coppa Italia bracket, say) is a direct
sheet paste: add rows to `cupFixtures` with that season's label filled in by
hand, the same way Serie A archive tabs, `pastTeams`, and
`seasonTeamAttributes` are all populated for history.

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

Three audience figures are tracked:
- **Home audience** - only that club's home games. This is what an LED
  perimeter-board package buys, since those boards only exist at that club's
  own stadium.
- **Away audience** - only that club's away games - a club's own draw power
  as a *visitor*, since some clubs pull a bigger audience than usual for
  whichever stadium they're playing at, independent of that home club's own
  pull. Available from the "Clubs ranked by" dropdown and as a sortable
  column in the table, same as the other two.
- **Total audience** - home and away combined. This is what a jersey/kit
  partnership buys, since the badge is on screen wherever the club plays.

Both are DAZN + Sky combined by default (Sky's figure only counts on games
also marked `onSky`) - uncheck **Include Sky audience** (top right of the
page) to see DAZN-only numbers instead, useful for a season where Sky
audience wasn't tracked or is incomplete, since a partial Sky figure would
otherwise understate some games relative to others rather than just leaving
them out. This choice is saved in the URL (`?sky=0` when off, dropped
entirely when on) so a reloaded or bookmarked/shared Dashboard link keeps
showing the same numbers. **Added time** (average stoppage-time minutes per
home game) is tracked separately, unweighted by audience, for evaluating the
cheaper LED packages that only run during stoppage time.

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
(click again, or its row again, to go back to league-wide) - or use the
**Focus club** dropdown in the header, which stays reachable without
scrolling since the header is sticky. The full-club table and the day+time
breakdown table both support sorting by more than one column - shift+click
a second header to add it as a tiebreaker instead of replacing the sort.

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
- **Remaining fixtures** - counts of big matches/derbies/other still to come
  among the unplayed fixtures - league-wide, or a focused club's remaining
  home games specifically, since a sponsorship decision made mid-season
  cares about what's left, not just the season-to-date average.
- **Home audience by opponent** - focus a club to see which visiting
  opponents actually draw the biggest audience at their stadium (a season
  average hides this entirely - a Torino-Juventus night isn't a
  Torino-Lecce one), plus the min-max range across all their home games.
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
