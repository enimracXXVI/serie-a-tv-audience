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
  into `client/public/crests/<team-slug>.svg` (see the `teams` sheet tab for
  slugs) to replace them; no code changes needed.

I already created and seeded the Google Sheet in your Drive:
https://docs.google.com/spreadsheets/d/1h3ZN2H5_ISzLUCW_AtbP2nFSRoMf7htwL8PYYAtRq4o/edit
(380 fixtures loaded). Its ID is already in `client/src/lib/config.js` — you
don't need to create a sheet. Columns A-L (id, matchday, day, date, home,
away, homeScore, awayScore, mainAudience, otherAudience, kickoffTime,
updatedAt) were part of the original seed - `day` is kept in sync
automatically: editing a fixture's `date` from the app recomputes `day` from
the new date on every save, so it can't go stale even though it started as a
plain static value at seed time. The app also now reads/writes
columns M-P for newer fields — the app writes to these by cell position, so
it works with or without header labels, but for your own reference when you
open the sheet directly, add these labels to row 1 if you want them:

| Column | Label | Meaning |
|---|---|---|
| M | otherBroadcaster | Blank, or another broadcaster's `slug` from the `broadcasters` tab (see below) — this game is also shown there, alongside the main broadcaster |
| N | addedTime1H | Added/injury time, first half (minutes) |
| O | addedTime2H | Added/injury time, second half (minutes) |
| P | simulcastAudience | Audience for the main broadcaster's multi-game simulcast slot, when applicable |
| Q | homeMatchdaySponsor | TRUE/FALSE — home club had a matchday sponsor activation at this match |
| R | homePlayerMascot | TRUE/FALSE — home club had a player mascot at this match |
| S | homeWalkabout | TRUE/FALSE — home club had a walkabout at this match |
| T | awayMatchdaySponsor | Same three, for the away club |
| U | awayPlayerMascot | |
| V | awayWalkabout | |
| W | isBigMatch | TRUE/FALSE — both clubs in this fixture are marked `bigClub` |
| X | isDerby | TRUE/FALSE — the two clubs in this fixture are each other's `derbyRival` |
| Y | extraLedMinutes | Extra LED perimeter-board minutes purchased for this specific home game, on top of whatever's contracted for the season (see `teamSeasons`' LED columns below) |
| Z | penaltyTaken | TRUE/FALSE — a penalty was taken during the 90 minutes of this match (only meaningful, and only shown in the app, for a home club with a penalty-LED deal that season) |

These TRUE/FALSE columns accept a real checkbox cell or plain text - "TRUE",
"true", or "True" (with or without stray whitespace) all count as checked;
anything else (including a blank cell) counts as unchecked. Handy to know
when pasting historical data by hand rather than using the app's own
checkboxes, e.g. into a past-season archive tab (see below).

### Broadcaster naming (`broadcasters` tab, shared with cup fixtures)

DAZN/Sky Sport being the official Serie A broadcasters is a fact about
*today*, not something to hardcode - this could change in a future season.
The `broadcasters` tab (already used for cup fixtures - see below) is now
also the source of truth for the main Serie A calendar: header row `slug`,
`name`, `logoUrl`, `isMain`. You may also keep an `id` column for your own
bookkeeping reference - if you add one, the app auto-fills it on every new
row with the next plain integer after the highest one already in that
column (1, 2, 3, ...), the same way the fixtures tab's own numeric `id`
column works; give the column a custom number format (e.g. `"ID"00000`) if
you want it to *display* as `ID00001` - the app only ever reads/writes the
underlying number, never that formatted text, so the format is entirely up
to you. The same applies to every other tab below that has one (`teams`,
`teamSeasons`, `competitions`, `seasons`). Exactly one row should have `isMain` set to TRUE - that's the **main
broadcaster** (e.g. DAZN today), configured from the hamburger menu's
**Settings → Broadcasters** panel by clicking **Set as main broadcaster** on
the row you want. Its name/logo replaces every hardcoded "DAZN" label across
the Serie A calendar and Dashboard. Every *other* row in this tab becomes a
per-fixture choice: column M (`otherBroadcaster`, above) is either blank or
one of these broadcasters' `slug` - picked from a dropdown on a fixture's
**Kickoff** edit tab, exactly like a cup fixture's broadcaster picker (a
plain broadcaster **name**, typed by hand rather than picked from the
dropdown, still resolves too - slug is checked first, then name, same
fallback pattern as clubs). There's no fixed "second broadcaster" anymore -
one game might also be shown on Sky, another on a different channel
entirely, and a third nowhere else at all.

**Column M was previously `onSky` (TRUE/FALSE)** - if you're updating from an
earlier version of this app, rename that header cell to `otherBroadcaster`
and change any existing `TRUE` cells to the specific broadcaster's `slug`
(e.g. `sky`) instead; leave `FALSE`/blank cells blank. Do this in the live
season's fixtures tab (whichever tab the `seasons` tab's `current` row
points at, e.g. `fixtures_26_27` - see "Past seasons" below) and any archive
tabs you've created. Columns I/J/P are named `mainAudience`/`otherAudience`/
`simulcastAudience` (renamed from the earlier `daznAudience`/`skyAudience`/
`daznSimulcastAudience`, back when DAZN/Sky were hardcoded) - their on-screen
labels are dynamic: `mainAudience` shows as "*(main broadcaster's name)*
audience", `otherAudience` as the generic "Other broadcaster audience" (since
which broadcaster that is can now vary fixture to fixture), and
`simulcastAudience` as "*(main broadcaster's name)* simulcast audience".

The Q-V columns are only editable from the home page's **Sponsors** tab (per
matchday card), and only show checkboxes for whichever side of a fixture is a
club marked `sponsored` for that season in the `teamSeasons` tab (see below).
Whatever's checked shows up as a small badge on that fixture everywhere it's
displayed — home page, combined calendars, single-team calendars — regardless
of sign-in.

W-X aren't editable anywhere in the app - they're a read-only mirror of what
the `teamSeasons` tab's `bigClub`/`derbyRival` settings for that season
compute for that fixture, written there so you can see/filter/reference it
directly in the sheet instead of only inside the app. They get refreshed
automatically whenever that fixture is edited from any of the home page's
tabs, and you can also click **Sync big match / derby tags - all seasons** in
Settings' **Sponsorship / big match / derby** panel (signed in) to write them
for every configured season's own tab in one go - useful right after
changing a club's `bigClub`/`derbyRival` (live or past-season), so historical
rows update immediately instead of waiting for their next edit. An archive
season whose tab doesn't exist yet is reported as failed rather than aborting
the sync for every other season.

Y-Z are only editable from the home page's **LED** tab (per matchday card),
and only show up at all for a fixture whose *home* club has an LED deal for
that season - `extraLedMinutes` is a free-entry number (extra minutes bought
for that one game, on top of the season's base per-fixture `ledMinutes`),
`penaltyTaken` only appears if that home club's `penaltyLed` is checked.
Both are scoped to the home side only, same as the Q-V columns above and
the Dashboard's own "home audience" framing - LED perimeter boards only
exist at a club's own stadium, so there's no "away LED" concept. The same
LED tab (and the same Y-Z columns) also shows up on a Coppa Italia cup
fixture up to the semifinals - see "LED perimeter-board tracking" below.

**This same tab now also holds cup fixtures** (Coppa Italia, Champions
League, etc.) for this season, sharing the header row above with a handful
of extra cup-only columns after column Z - see "Cups" further down for the
full list. A row's `competition` column decides which kind it is: blank (or
`serie-a`) is a Serie A row like every one above; anything else is a cup
fixture. If you're pasting Serie A rows by hand, just leave `competition`
blank - there's nothing else to fill in for a Serie A row that a cup row
doesn't also need.

### Settings panel layout

The hamburger menu's **Settings** view has grown into several panels
(teams, sponsorship/big-match/derby, competitions, broadcasters) - each one
is a collapsible section, collapsed by default, so opening Settings shows a
short scannable list of section names rather than every panel's full
contents at once. Click a section's title to expand it.

### The `teams` tab - every club in one place

Every club the app knows about - the current Serie A roster and everyone
else (a former Serie A club, a domestic cup opponent, a European cup
opponent) - lives in a single sheet tab named `teams`, one shape for all of
them. There's no separate bundled roster file and no second "other clubs"
tab anymore; a club's `scope` decides which group it belongs to.

Header row: `slug`, `name`, `long`, `short`, `primary`, `secondary`,
`crestUrl`, `scope` (an `id` column is also fine to keep, same
auto-fill deal as `broadcasters`' above).

- `slug` is the row's **key** - pick something short and URL-safe
  (`inter`, `real-madrid`) and never change it once fixtures reference it.
  This is what makes renaming a club safe (see below) - the app matches a
  fixture's `home`/`away` cell to a club by slug first, so the display
  `name` can change freely without breaking historical matching.
- `name` is the display name - shown everywhere, and what a **new** fixture
  or cup fixture's `home`/`away` cell resolves against if it was typed by
  hand rather than picked from the app's own dropdown (which always writes
  the slug). Rename a club any time from Settings; it's always safe going
  forward.
- `long` - the club's full/official name (e.g. `FC Internazionale Milano`,
  `SSC Napoli`). Not read anywhere in the app yet - it's a reference column
  for now, kept for a possible future switch to displaying full names
  instead of `name`.
- `short`, `primary`, `secondary` - 3-letter code and hex colours, shown on
  mobile / used for chart lines and borders.
- `crestUrl` - same `=IMAGE("url")`-or-plain-URL rule as everywhere else in
  this app (see below).
- `scope` - `current` (playing Serie A this season), `national` (a former
  Serie A club, or a domestic-cup-only opponent), or `european` (a
  continental-only opponent). Decides three things: which group a club
  shows up under in Settings, whether it's offered in the Serie A fixture
  picker (`current` only), and which clubs are offered as cup-fixture
  opponents for a given competition (see "Cups" below - a `current` club is
  always offered regardless of competition, a `national`/`european` club
  only for a matching-scope competition).

Paste this seed block into A2 to start with the current 20-club roster (one
row per club, tab-separated - copy it as-is and Sheets will split it into
columns automatically; fill in `crestUrl` from Settings once you're signed
in, and add any past/opponent clubs you need as their own rows with `scope`
set to `national`/`european`):

```
atalanta	Atalanta	ATA	#1E71B8	#000000		current
bologna	Bologna	BOL	#8B1D2C	#1B3E7A		current
cagliari	Cagliari	CAG	#C8102E	#00205B		current
como	Como	COM	#0066B3	#FFFFFF		current
fiorentina	Fiorentina	FIO	#482E92	#FFFFFF		current
frosinone	Frosinone	FRO	#FFD400	#003DA5		current
genoa	Genoa	GEN	#C8102E	#00205B		current
inter	Inter	INT	#003DA5	#000000		current
juventus	Juventus	JUV	#000000	#FFFFFF		current
lazio	Lazio	LAZ	#87D8F7	#FFFFFF		current
lecce	Lecce	LEC	#FFD100	#C8102E		current
milan	Milan	MIL	#FB090B	#000000		current
monza	Monza	MON	#C8102E	#FFFFFF		current
napoli	Napoli	NAP	#12A0D7	#003DA5		current
parma	Parma	PAR	#FFD400	#003DA5		current
roma	Roma	ROM	#8E1F2F	#F0BC42		current
sassuolo	Sassuolo	SAS	#00A650	#000000		current
torino	Torino	TOR	#7B1E3A	#FFFFFF		current
udinese	Udinese	UDI	#000000	#FFFFFF		current
venezia	Venezia	VEN	#FF6600	#000000		current
```

Managed from the hamburger menu's **Settings** panel's **Teams** section -
three collapsible groups (**Current roster** / **National** / **European**,
by `scope`), each an expandable row with the same fields as above plus a
**Delete club** button. Promoting/relegating a club is just changing its
`scope`, not moving it between tabs or editing a code file.

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

**Migrating from the old `teams.json` + `teams`/`otherClubs` tab split:** if
you're upgrading from before this change, do this once:

1. Rename the old `otherClubs` tab to `teams` (Sheets → right-click the tab
   → Rename) - it already has `slug`/`scope` columns in the right shape.
2. Add a row for each of the current 20 Serie A clubs (the seed block above),
   copying over any live overrides (renamed name, custom colours/crest) from
   the old `teams` tab before you clear it, with `scope` set to `current`.
3. Copy each existing row's `sponsored`/`bigClub`/`derbyRival`/
   `matchdaySponsors`/`playerMascots`/`walkabouts` value (if any) into the
   new `teamSeasons` tab instead - see below, this is where those fields
   live now, for every season including the current one.
4. Delete the old `teams.json`-driven columns/tab once you've confirmed the
   app looks right - nothing reads them anymore.

Existing `fixtures`/`cupFixtures`/archive rows need **no changes at all** -
a fixture written before this change still has a club's old *name* text in
its `home`/`away` cell, and the app still resolves that correctly (name is
checked as a fallback whenever a slug isn't found), so there's nothing to
migrate there. The only thing name-matching can't survive is renaming a
club whose *old* fixture rows were never touched - if you rename a club and
want its full history bullet-proofed against a future rename too, a one-time
Find & Replace in the sheet (old name text → its slug) across
`fixtures`/`cupFixtures`/archive tabs is the belt-and-suspenders option, but
isn't required for anything to keep working today.

### `teamSeasons` tab - sponsorship / big-match / derby, per season

**Sponsored**, **big club**, **derby rival**, and the sponsor-activation
caps (**matchday sponsors**, **player mascots**, **walkabouts**) are
season-scoped facts about a club, not permanent attributes - a club
sponsored in 24/25 isn't necessarily sponsored now, or vice versa, and that
must not silently flip to "sponsored in every season" or "never sponsored in
the past" just because this season's Settings say so. One tab, one
mechanism, covers every season including the current one - there's no
separate "live" version of these fields on the `teams` tab anymore.

Add a `teamSeasons` tab (doesn't exist in the seeded sheet - add it
yourself) with header row: `slug`, `team`, `season`, `sponsored`, `bigClub`,
`derbyRival`, `matchdaySponsors`, `playerMascots`, `walkabouts`, `ledMinutes`,
`addedTimeLed`, `penaltyLed`, `ledStartMatchday`, `addedTimeLedStartMatchday`,
`penaltyLedStartMatchday`, `goalCarpet`, `goalCarpetStartMatchday` (an `id`
column is also fine to keep, same auto-fill deal as the other tabs above).

- `slug` here is this **row's own key** - always `season::teamSlug` (e.g.
  `26/27::roma`) - the app fills this in for you when you save from
  Settings; only worth knowing if you're pasting rows directly. Don't
  confuse it with a `teams`-tab club slug on its own - that's the `team`
  column below.
- `team` - the club's `teams` tab slug (e.g. `roma`).
- `season` - must match a label in the `seasons` tab (see below), e.g.
  `26/27` or `24/25`.
- `sponsored`, `bigClub` - TRUE/FALSE (tolerant parsing - a real checkbox or
  plain "TRUE"/"true" text both work).
- `derbyRival` - another club's **slug** (not a name) - whichever club
  counts as this one's derby rival *for that season*.
- `matchdaySponsors`, `playerMascots`, `walkabouts` - counters for tracking
  your company's in-stadium sponsorship activity at that club that season;
  leave blank for a club you don't sponsor that season.
- `ledMinutes`, `addedTimeLed`, `penaltyLed`, `ledStartMatchday`,
  `addedTimeLedStartMatchday`, `penaltyLedStartMatchday`, `goalCarpet`,
  `goalCarpetStartMatchday` - this club's LED perimeter-board (and goal
  carpet) deal for that season, if any - see "LED perimeter-board tracking"
  below. Independent of `sponsored` - a club can have an LED deal without
  being a matchday-sponsor/mascot/walkabout club, or vice versa.

A club with **no row** for a given season shows as not sponsored, not a big
club, no derby rival, no caps, no LED deal for that season - there's no
fallback to any other season, by design. Managed from the hamburger menu's
**Settings** panel's **Sponsorship / big match / derby** section: pick any
season (current or archive) from the dropdown, and every club that actually
played it that season gets an expandable row with these fields.

`bigClub` and `derbyRival` drive automatic match highlighting - neither is
stored per fixture, both are worked out live from the two teams involved for
whichever season is being viewed:
- **Big match**: flip `bigClub` on for any club considered a marquee side
  that season: whenever two `bigClub` clubs play each other, that fixture is
  a big match.
- **Derby**: pick a `derbyRival` for a club and a fixture only counts as a
  derby between those two *specific* clubs that season - e.g. Roma's rival
  set to Lazio means Roma-Lazio is a derby, but Roma-Milan isn't, even if
  Milan has its own derby rival set elsewhere.

Both show up as a small coloured left border plus a DERBY/BIG label on the
fixture, everywhere it's displayed.

### LED perimeter-board tracking

A separate deal from sponsorship/big-match/derby above - a club's LED
perimeter-board advertising is scoped to *their own home games* (the boards
only exist at that club's own stadium, same "home audience" framing as the
Dashboard), tracked with `teamSeasons`' three LED columns plus two per-fixture
columns on the fixtures tab (see "Y-Z" above):

- **`ledMinutes`** (per season/club) - core LED minutes contracted **per home
  fixture** that season - a rate, not a season-long total. A number, not a
  boolean, since it's a minutes count rather than a yes/no. `0` is a valid
  rate (e.g. a club whose only LED terms are added-time-exclusive or
  penalty-exposure, with no separate per-fixture minutes) - "no LED deal at
  all" is left **blank**, not `0`.
- **`addedTimeLed`** (per season/club) - your brand is the only one allowed
  on LED during all added/stoppage time at that club's home games that
  season.
- **`penaltyLed`** (per season/club) - your brand gets LED exposure whenever
  *any* team (home or away) takes a penalty during the 90 minutes at that
  club's home games that season.
- **`extraLedMinutes`** (per fixture) - extra LED minutes purchased for that
  one specific home game, on top of the season's per-fixture `ledMinutes`
  rate. Free entry, no cap.
- **`penaltyTaken`** (per fixture) - a penalty was actually taken during that
  game's 90 minutes - only shown (and only meaningful) if that game's home
  club has `penaltyLed` checked for the season.
- **`ledStartMatchday`** (per season/club, optional) - if the base
  per-fixture **LED minutes** rate (`ledMinutes`) only started partway
  through the season (signed after the season kicked off), the matchday it
  starts from - earlier home games don't count the base rate at all,
  rather than counting it with 0 minutes. Leave blank for a rate that's
  been live since matchday 1 (the default, and the common case).
- **`addedTimeLedStartMatchday`** (per season/club, optional) - same idea,
  but for `addedTimeLed` specifically - a club can add "exclusive during
  added time" to an existing deal on its own separate date.
- **`penaltyLedStartMatchday`** (per season/club, optional) - same idea,
  but for `penaltyLed` specifically. All three of these start-matchdays are
  fully independent of each other and of `goalCarpetStartMatchday` below -
  a club's base rate, added-time exclusivity, penalty exposure and goal
  carpet can each start on a completely different matchday, and a fixture
  only drops out of the Dashboard's LED exposure card and the per-fixture
  LED tab entirely if literally none of them apply to it yet.
- **`goalCarpet`** (per season/club) - a branded pitch-side goal carpet, a
  completely different piece of signage from the LED boards above with no
  per-fixture minutes concept of its own. A club whose *only* checked LED
  field is `goalCarpet` still counts as having a deal (shows the LED badge
  in Settings, gets a Dashboard LED exposure card), but that card reports
  audience reach only - it never fabricates a minutes figure for something
  that was never measured in minutes to begin with.
- **`goalCarpetStartMatchday`** (per season/club, optional) - same idea as
  `ledStartMatchday`, but for the goal carpet specifically, independent of
  it. Leave blank for a carpet deal that's been live since matchday 1.

All eight are managed the same way as everything else here: the season-level
six from Settings' **Sponsorship / big match / derby** panel (a club with
nothing set has no LED deal, same "no fallback to another season" rule as
sponsored/bigClub), the per-fixture two from a **LED** tab on the home
page's matchday cards, which only shows up at all for a fixture whose home
club has some LED deal that season.

**Scope: Serie A, plus Coppa Italia up to the semifinals.** Unlike the
sponsor-activation tracking above (Serie A only, no exceptions), a Coppa
Italia fixture also gets the same **LED** tab and the same Y-Z columns,
reading the same home club's `teamSeasons` LED settings - *except* the
final, which is played at a neutral venue (there's no "home club's own
stadium" for a final, so LED naturally doesn't apply there). The app
doesn't match on round text for this - it simply checks that the
competition is Coppa Italia and the fixture's own `neutralVenue` isn't
checked, which already excludes the final without needing to know it's
called "Final". Every other cup (Champions League, Europa League,
Conference League) still doesn't track LED at all.

## Adding fixtures from the app

Serie A's 380 fixtures were pre-seeded into the sheet all at once at the
start of the season - that's still the fastest way to bulk-load a whole
schedule, and always available: paste more rows directly into the `fixtures`
tab whenever you want. But you don't have to go to the sheet for a one-off:
signed in on the home page, **Add fixture** opens a small form - matchday,
home club, away club, date, kickoff time - that appends a single new row
without leaving the app. The matchday number stays filled in after each add,
so adding several fixtures for the same round is just: submit, pick the next
two clubs, submit again.

## Past seasons

The **Standings** and **Fixtures** (home) pages have a season dropdown next
to their header, defaulting to the current, live season. Past seasons are
read-only archives - which seasons exist, and which archive fixtures tab
each one reads from, is itself a sheet tab now (`seasons`), not a hardcoded
list:

Add a `seasons` tab (doesn't exist in the seeded sheet - add it yourself)
with header row: `label`, `slug`, `tab`, `current` (an `id` column is also
fine to keep, same auto-fill deal as the other tabs above).

```
26/27	26-27	fixtures_26_27	TRUE
25/26	25-26	fixtures_25_26	FALSE
24/25	24-25	fixtures_24_25	FALSE
```

- `label` - shown in every season dropdown, e.g. `26/27`.
- `slug` - a URL-safe version of the label (e.g. `26-27`, no slash) - this is
  what actually appears in the page URL (`?season=26-27`) when you switch
  seasons, since `label`'s `/` doesn't round-trip cleanly through a query
  string. Keep it unique and don't rename it once you've shared a link using
  it.
- `tab` - **every** season, including the live one, points at a real
  fixtures tab now - there's no blank/implicit-live convention anymore.
  The live season's row points at whichever tab is actually being written
  to today (e.g. `fixtures_26_27`); an archive season's row points at a
  read-only tab with **the exact same header row as the live one** - both
  the Serie A columns (id, matchday, day, date, home, away, homeScore,
  awayScore, mainAudience, otherAudience, kickoffTime, updatedAt,
  otherBroadcaster, addedTime1H, addedTime2H, simulcastAudience,
  homeMatchdaySponsor, homePlayerMascot, homeWalkabout, awayMatchdaySponsor,
  awayPlayerMascot, awayWalkabout, isBigMatch, isDerby, extraLedMinutes,
  penaltyTaken) and, on the same tab, that season's cup fixture rows (see
  "Cups" below for their columns). Neither archive tab exists yet in the
  seeded sheet - create `fixtures_25_26` and `fixtures_24_25` yourself
  (header row + past results, both Serie A and cup, pasted in).
- `current` - TRUE on exactly one row - **this**, not whether `tab` is
  blank, is what decides which season is live and editable.

If this tab doesn't exist yet (or is empty), the app falls back to a single
built-in `26/27` (current) season so it isn't hard-broken before you set it
up - add the tab whenever you're ready, not before. Every row is shown in
the dropdown regardless of whether its `tab` exists, so only add a row once
its tab is there with data in it - picking one whose tab is missing or
malformed shows a load error instead of data.

Selecting a past season switches Standings/Fixtures to show that season's
data, view-only - no editing controls (Add fixture, Sync tags, score/audience
edit tabs) appear, since these tabs are never written to by the app. Adding a
future season later is the same pattern: add a tab with that header row, add
one row to `seasons` - no code change needed, unlike before.

The table and charts on Standings (and every per-club section on the
Dashboard - see below) compute a past season's own club list from whoever
actually appears in its fixtures, not from the current Serie A roster - a
club that's been promoted or relegated since then still gets a correct
record and shows up everywhere it should for the season it actually played
in, even if its `teams` row's `scope` has since changed away from `current`.

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

Entirely a sheet operation now - no code change or redeploy needed:

1. **Relegate the 3 outgoing clubs**: on their `teams` rows, change `scope`
   from `current` to `national` - their branding stays exactly as it was,
   they just stop being offered as a Serie A fixture opponent and move to
   the **National** group in Settings.
2. **Promote the 3 incoming clubs**: add a `teams` row for each (or change
   an existing `national` row's `scope` back to `current`, if it's a club
   that was relegated before), with `scope` set to `current`.
3. **Create the new season's own fixtures tab**: since every season
   (including the live one) already points at its own named tab
   (e.g. this season is `fixtures_26_27`), rolling over doesn't clear or
   reuse a fixed tab - just create a fresh one for the new season (e.g.
   `fixtures_27_28`) with the same header row and paste in its Serie A
   fixture list; the new season's own cup fixtures (Coppa Italia, etc.)
   go in this same new tab too, once they're known (see "Cups" below - a
   cup season can only be added to via the app, or pasted in, once it's
   the live one). Add a row for it to the `seasons` tab with `current` set
   to TRUE and its own `slug` (e.g. `27-28`), and flip the just-finished
   season's row to `current` FALSE - its `tab` keeps pointing at the
   season that just ended (e.g. `fixtures_26_27`), which now becomes a
   read-only archive (both its Serie A and cup rows).
4. Promoted clubs' `sponsored`/`bigClub`/`derbyRival`/caps all default to
   unset for the new season - set them from the **Sponsorship / big match /
   derby** Settings panel once the roster's updated (pick the new season
   from its dropdown).

### Serie A logo

Serie A isn't a cup, but it lives as an ordinary row in the `competitions`
tab (see "Cups" below) anyway - `slug` set to `serie-a` - purely so its
logo has a home without needing its own single-purpose tab. Set it from the
top of Settings' **Competitions** section (it's the same kind of "one logo"
setting as every competition listed below it, so it lives there rather than
its own section); it shows up next to the page title on the Fixtures and
Standings headers. Leave it unset to show just the plain text title. This
row is never offered as a cup competition anywhere (Add cup fixture, the
Cups page's grouping, etc.) - it's filtered out specifically because it
isn't one.

There's no `appSettings` tab anymore - if you're upgrading from an earlier
version of this app, delete it once you've copied its `serieALogoUrl` value
onto the `competitions` tab's `serie-a` row's `logoURL` column.

## Cups (Coppa Italia / Champions League / Europa League / Conference League)

Cup fixtures don't fit the Serie A schema - no round-robin, no fixed
38-matchday table, and opponents aren't limited to the current roster - but
they do now live in the very same per-season fixtures tab as the Serie A
calendar (see "Y-Z"/"This same tab now also holds cup fixtures" above),
rather than a separate standalone tab of their own. `broadcasters` and club
branding (the unified `teams` tab) were already shared with the main Serie A
calendar; `competitions` is its own small tab below. None of these exist in
the seeded sheet - add them yourself if you want to track cup competitions:

**1. `competitions` tab** - which competitions exist, their logo, and their
scope, so a fixture list/form can show a badge instead of a plain text label
and know which `teams` to offer as opponents. Header row: `id`, `slug`,
`name`, `long`, `short`, `logoURL`, `scope` - `id`/`long`/`short` are extra
columns the app never reads or writes (same decorative/reference-only deal
as the equivalent columns on `teams`); the four that matter are:

- `slug` - the stable key a cup fixture's `competition` cell points at
  (e.g. `CoppaItalia`) - don't rename it once you've used it elsewhere.
- `name` - shown everywhere (Cups page headings, the Add fixture picker,
  Settings).
- `logoURL` - same `=IMAGE("url")`-or-plain-URL rule as crests, managed
  from Settings.
- `scope` - `national` or `european` - decides which non-current clubs show
  up as opponent options for that competition in the Add fixture form (a
  current Serie A club is always offered regardless); a blank/missing cell
  reads as `national` (a one-time fallback for a competition added before
  this column existed).

Serie A itself also lives as a row here (`slug` set to `serie-a`) purely to
hold its logo setting - see "Serie A logo" above; it's excluded everywhere a
*cup* competition is listed or picked. Paste this seed block into A2
(leaving `id`/`long`/`short` blank) to start with the four cups you'd
expect (`logoURL` blank, fill in from Settings):

```
	CoppaItalia	Coppa Italia			national
	ChampionsLeague	Champions League			european
	EuropaLeague	Europa League			european
	ConferenceLeague	Conference League			european
```

If this tab doesn't exist yet (or is empty), the app falls back to those
same four with no logo, so everything else below still works without it -
add it whenever you want logos, not before.

**2. `broadcasters` tab** - a small reusable list so a cup fixture's
broadcaster shows a logo badge instead of a retyped name. Header row:
`slug`, `name`, `logoUrl`, `isMain` (an `id` column is also fine to keep,
same auto-fill deal as the other tabs above). Also managed from
Settings. This tab is shared with the main Serie A calendar (see
"Broadcaster naming" above) - `isMain` marks the one row that's the
main/official broadcaster there; it has no effect on cup fixtures, where
every broadcaster (including the main one) is just a plain dropdown choice,
picked and stored by `slug` (a plain broadcaster name typed by hand still
resolves too, same slug-first/name-fallback rule as everywhere else).
A cup fixture reuses the same `otherBroadcaster` column a Serie A row uses
(see "Broadcaster naming" above) rather than a separate column of its own -
but its cell can hold **more than one** slug, comma-separated (e.g.
`dazn,Rai Sport`), since a cup tie often airs on more than one platform at
once, unlike a Serie A game's single main+other pair (which is never a
list). Each one is resolved and shown independently; an unresolved/typo'd
entry still shows as plain text rather than disappearing.

**3. Cup fixture rows, on the season's own fixtures tab** - there's no
separate `cupFixtures` tab anymore; a cup fixture is just another row on
that season's `fixtures_XX_YY` tab (the exact same tab documented up in
"Rolling over a new season"/"seasons"), using the extra columns after `Z`
(`extraLedMinutes`/`penaltyTaken`) that a Serie A row leaves blank: `competition`,
`round`, `neutralVenue`, `audience`, `etHomeScore`,
`etAwayScore`, `penHomeScore`, `penAwayScore` (broadcaster(s) reuse the
shared `otherBroadcaster` column, not a cup-only one - see below).
`competition` is what tells a
row apart from a Serie A one (see "This same tab now also holds cup
fixtures" above) - it holds the stable `value` key from the `competitions`
tab below (e.g. `CoppaItalia`), never blank or `serie-a` for an actual cup
row. `home`/`away` hold a club's `teams`-tab **slug** for anything added
through the app (a plain club **name** still works too - typed by hand, or a
row written before the slug-based rewrite - the app checks slug first, then
falls back to matching by name). There's no "your club vs the opponent"
distinction, both are just whichever two clubs actually played, resolved the
same way for either side - this is what lets two of your own sponsored
clubs meet each other correctly, and lets any club's crest/colours show up
as long as it has a `teams` row. `round` is free text (`Round of 16`, `Group A`, whatever your
competition calls it - there's no fixed round list, a group stage and a
knockout draw both just work); `neutralVenue` is TRUE/FALSE, for the rare
match (typically a final) at neither club's own ground - see "LED
perimeter-board tracking" above for why this column also decides whether a
Coppa Italia fixture gets LED tracking. There's no sponsor-activation
(matchday sponsor/player mascot/walkabout) tracking here (that was a
deliberate call - it stays Serie A home games only), just audience and
added time - though a sponsored club's name IS highlighted (bold + a small
dot), same as everywhere else in the app.

Which season a cup fixture belongs to is implicit in which tab it's on now
(there's no `season` column anymore - the app never reads or writes one) -
exactly like Serie A fixtures already worked before this change. Sponsorship
highlighting is season-scoped too, exactly like the main calendar, reading
the `teamSeasons` tab for whichever season is selected (only `sponsored` is
used for highlighting cup fixtures - `bigClub`/`derbyRival` don't apply here
by design; LED does apply, for Coppa Italia only - see "LED perimeter-board
tracking" above).

**Two-legged ties**: add both legs as two ordinary rows on the same season's
tab (same `competition`, `round`, and the same two clubs in `home`/`away` -
swapped between the two rows) - the app groups them automatically and shows
an aggregate score once both are played. There's no separate "tie" field to
fill in; grouping is purely by those matching columns, so keep `round`'s
spelling identical on both legs.

**Extra time / penalties**: `etHomeScore`/`etAwayScore` are optional - fill
them in only if a match (a single-leg round, a final, or the second leg of a
tie that's level on aggregate) went to extra time; they're that match's real
final score (already including the 90 minutes' goals, not added on top of
`homeScore`/`awayScore`), and take over from the regular-time score for
display and for a tie's aggregate once filled in. `penHomeScore`/
`penAwayScore` are the shootout score if it still came down to penalties -
these never change a scoreline, just who goes through when the score above
is level. All four are blank/unused on the vast majority of rows that never
needed them.

The hamburger menu's **Cups** page has a season dropdown, same
as Standings/Fixtures/Dashboard, filtering to whichever season's cup
fixtures you're looking at, grouped by competition and round, with the same
kind of expandable edit tabs as the main calendar (kickoff details; result,
added time, audience and broadcaster). **Signed in, on the current season**,
**Add fixture** opens a form to create a new cup fixture without touching
the sheet directly - pick the competition, round, then a home club and an
away club, each from the exact same combined list (every current-scope
`teams` row plus every `national`/`european` row whose scope matches this
competition), or add a brand new one inline, right there in the form, for
either side. There's also a free-text broadcaster field right there (not a
dropdown) so a fixture doesn't start broadcaster-less - type one slug, or
several comma-separated (e.g. `dazn,Rai Sport`), matching the same
comma-separated format the fixture row itself uses (see "Broadcaster
naming" above); it's still fine to add a cup fixture by pasting a row into
the sheet directly instead, whichever's quicker for what you're doing. **Past
cup seasons are frozen** - no Add fixture, no editing an existing row - same
precedent as Serie A's archive tabs. Backfilling an already-completed cup
season (a past Coppa Italia bracket, say) is a direct sheet paste: add rows
to that season's own `fixtures_XX_YY` tab, the same way Serie A archive
tabs and `teamSeasons` are all populated for history.

### Migrating from the old standalone `cupFixtures` tab

If you're upgrading from before cup fixtures moved onto the season's own
fixtures tab, do this once, per season you want to keep cup history for:

1. **Back up first** (Google Sheets → File → Version history → Name current
   version, or just duplicate the old `cupFixtures` tab) - the steps below
   move rows out of it for good.
2. For each season's rows in the old `cupFixtures` tab, copy them onto that
   season's own `fixtures_XX_YY` tab (a new tab if that season doesn't have
   fixture rows there yet, e.g. a cup-only season) - same columns as before,
   minus the old `season` column (implicit now - see "This same tab now
   also holds cup fixtures" above), so drop `season` and leave `competition`
   as-is for every cup row you copy over.
3. Delete the old `cupFixtures` tab once you've confirmed the Cups page
   looks right for every season - the app no longer reads it.

### Migrating from the even older `ourClub`/`opponent` shape

If your (now-retired) `cupFixtures`/`cupTeams` tabs still use the previous
columns (`ourClub`, `opponent`, `homeAway`, `ourScore`, `theirScore`,
`etOurScore`/`etTheirScore`, `penOurScore`/`penTheirScore`, and `cupTeams`'
old `slug` column), run the one-time converter below first, then follow the
migration above to move its output onto each season's own tab - reshuffling
which score belongs to `home` vs `away` depends on each row's old `homeAway`
value, which is tedious and error-prone to do row by row. **Back up both
tabs first** (Google Sheets → File → Version history → Name current
version, or just duplicate the tabs) - this script overwrites `cupFixtures`
and `cupTeams` in place.

1. Open the app in a browser tab and **sign in** (the script reuses that
   session to write).
2. Open that tab's DevTools console (F12 or Cmd+Opt+I), paste in the
   contents of `scripts/migrate-cup-fixtures.js` from this repo, and press
   Enter.
3. It logs each step (reading, converting, writing) and a summary count -
   check for errors before trusting the result, then delete your backup
   copies once you've confirmed the Cups page looks right.

This script still writes its output to `cupFixtures`/`cupTeams` tabs (the
shape that existed when it was written) - the app itself no longer reads
either tab, so if you're running this old migration today, follow it up
with: copying `cupTeams`' rows into the unified `teams` tab by hand
(name/short/crestUrl/primary/secondary as-is, `scope` set to
`national`/`european` depending on its old `competition`), then the
standalone-`cupFixtures`-tab migration above to get its rows onto each
season's own tab.

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

Both are main-broadcaster + other-broadcaster combined by default (the other
broadcaster's figure only counts on games with an `otherBroadcaster` set) -
toggle off **Include other-broadcaster audience** (top right of the page) to
see main-broadcaster-only numbers instead, useful for a season where the
other broadcaster's audience wasn't tracked or is incomplete, since a partial
figure would otherwise understate some games relative to others rather than
just leaving them out. This choice is saved in the URL (`?other=0` when off,
dropped entirely when on) so a reloaded or bookmarked/shared Dashboard link
keeps showing the same numbers. **Added time** (average stoppage-time minutes
per home game) is tracked separately, unweighted by audience, for evaluating
the cheaper LED packages that only run during stoppage time.

**Simulcast handling**: when several games share an exact kickoff slot, the
main broadcaster airs them as one program with a single shared
`simulcastAudience` figure (see the fixtures sheet columns above) instead
of - or alongside - each game's own `mainAudience`. Counting both as-is would
double-count the same viewers across every game in the slot, so by default
the dashboard ignores `simulcastAudience` entirely and uses only each
game's own `mainAudience`. Toggling on **Include simulcast** (top right of the
page) instead gives each game in a shared slot an even split of that slot's
shared figure (`simulcastAudience ÷ number of games in the slot`), added
on top - a smart-but-approximate adjustment, off by default.

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
  underneath for the exact numbers. Days are the heatmap's columns (there
  are at most 7, so they always fit without scrolling) and kickoff times are
  the rows (an unbounded axis - a season could use a handful of slots or
  many - so it grows down the page instead of forcing a wide table).
  Kickoff times are shown exactly as scheduled, never merged into
  neighbouring slots.
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

Every card on the page has a small camera button in its top-right corner -
click it to download just that card as a PNG (2x resolution), e.g. to drop
into a sponsorship deck without a manual screen-crop.

On desktop, a slim dot rail floats down the left edge of the page (hidden on
mobile, where there's no room for it) - hover a dot to see which card it
jumps to, click to scroll straight there instead of hunting up and down the
page for it.

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
