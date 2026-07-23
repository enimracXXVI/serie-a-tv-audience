import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import ToggleSwitch from './ToggleSwitch.jsx';
import { useTeams } from '../lib/useTeams.jsx';
import { useClubs } from '../lib/useClubs.jsx';
import { useSeasonFixtures } from '../lib/useSeasonFixtures.js';
import { useTeamSeasons } from '../lib/useTeamSeasons.jsx';
import { teamsInFixtures, hasLedDeal } from '../lib/teams.js';
import { makeId } from '../lib/teamSeasons.js';
import { useSeasons } from '../lib/useSeasons.jsx';
import { callWithReauth } from '../lib/reauth.js';
import { syncAllSeasonsMatchTags } from '../lib/syncSeasonTags.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-center text-sm text-white outline-none focus:border-[#1fd8c9]';

// Label-above, center-aligned wrapper for every plain text/number/select
// field in the expanded form - toggles keep their own switch+label layout
// (see ToggleSwitch) since a toggle isn't really a "field" in the same
// sense.
function Field({ label, children }) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      {children}
    </label>
  );
}

function TeamSeasonRow({ season, team, roster, row, session, saveTeamSeason }) {
  const [expanded, setExpanded] = useState(false);
  const [sponsored, setSponsored] = useState(Boolean(row?.sponsored));
  const [bigClub, setBigClub] = useState(Boolean(row?.bigClub));
  const [derbyRival, setDerbyRival] = useState(row?.derbyRival || '');
  const [matchdaySponsors, setMatchdaySponsors] = useState(row?.matchdaySponsors ?? '');
  const [playerMascots, setPlayerMascots] = useState(row?.playerMascots ?? '');
  const [walkabouts, setWalkabouts] = useState(row?.walkabouts ?? '');
  const [ledMinutes, setLedMinutes] = useState(row?.ledMinutes ?? '');
  // UI-only - not its own persisted column. Derived from whether ledMinutes
  // is currently set, since that null-vs-number state already encodes "has
  // a base LED-minutes deal" without needing a redundant boolean of its own.
  const [ledEnabled, setLedEnabled] = useState(row?.ledMinutes !== null && row?.ledMinutes !== undefined);
  const [addedTimeLed, setAddedTimeLed] = useState(Boolean(row?.addedTimeLed));
  const [penaltyLed, setPenaltyLed] = useState(Boolean(row?.penaltyLed));
  const [ledStartMatchday, setLedStartMatchday] = useState(row?.ledStartMatchday ?? '');
  const [addedTimeLedStartMatchday, setAddedTimeLedStartMatchday] = useState(row?.addedTimeLedStartMatchday ?? '');
  const [penaltyLedStartMatchday, setPenaltyLedStartMatchday] = useState(row?.penaltyLedStartMatchday ?? '');
  const [goalCarpet, setGoalCarpet] = useState(Boolean(row?.goalCarpet));
  const [goalCarpetStartMatchday, setGoalCarpetStartMatchday] = useState(row?.goalCarpetStartMatchday ?? '');
  const [saveError, setSaveError] = useState(null);
  // ledMinutes here is the raw <input> string ('' when never set, '0' is a
  // real value) - hasLedDeal expects a number|null, so normalize before
  // reusing the same "is 0 still a deal" rule as everywhere else.
  const ledDeal = hasLedDeal({ ledMinutes: ledMinutes === '' ? null : Number(ledMinutes), addedTimeLed, penaltyLed, goalCarpet });

  async function commit(fields) {
    setSaveError(null);
    try {
      await callWithReauth(session, (token) => saveTeamSeason(season, team.slug, fields, token));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  function toggleLed(v) {
    setLedEnabled(v);
    if (!v) {
      setLedMinutes('');
      commit({ ledMinutes: null });
    }
  }

  return (
    <div className="rounded-lg bg-white/5">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full flex-col gap-1.5 px-3 py-2.5 text-left">
        <div className="flex items-center gap-3">
          <Crest team={team} size={26} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{team.name}</span>
          <span className="shrink-0 text-white/40">{expanded ? '▾' : '▸'}</span>
        </div>
        {/* Wraps onto its own line(s) rather than fighting the name/arrow for
            horizontal space - a club with all four badges (sponsor/big/
            derby/LED) was overflowing the row on narrow screens, pushing the
            expand arrow off-screen entirely. */}
        {(sponsored || bigClub || derbyRival || ledDeal) && (
          <div className="flex flex-wrap gap-1.5 pl-[38px]">
            {sponsored && (
              <span className="rounded-full bg-[#1fd8c9]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1fd8c9]">
                Sponsor
              </span>
            )}
            {bigClub && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                Big
              </span>
            )}
            {derbyRival && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">
                Derby
              </span>
            )}
            {ledDeal && (
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-400">
                LED
              </span>
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3">
          {session.signedIn ? (
            <>
              {/* Row 1: big club + derby rival (derby's own "None" option is
                  its generic/default state). */}
              <div className="flex flex-wrap items-end gap-4">
                <ToggleSwitch
                  checked={bigClub}
                  onChange={(v) => {
                    setBigClub(v);
                    commit({ bigClub: v });
                  }}
                  label="Big club"
                />
                <Field label="Derby rival">
                  <select
                    value={derbyRival}
                    onChange={(e) => {
                      setDerbyRival(e.target.value);
                      commit({ derbyRival: e.target.value });
                    }}
                    className={`${inputClass} w-40`}
                  >
                    <option value="">None</option>
                    {roster
                      .filter((t) => t.slug !== team.slug)
                      .map((t) => (
                        <option key={t.slug} value={t.slug}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>

              {/* Row 2: sponsored + activation caps. */}
              <div className="flex flex-wrap items-end gap-4 border-t border-white/10 pt-3">
                <ToggleSwitch
                  checked={sponsored}
                  onChange={(v) => {
                    setSponsored(v);
                    commit({ sponsored: v });
                  }}
                  label="Sponsored"
                />
                {sponsored && (
                  <>
                    <Field label="Matchday sponsor">
                      <input
                        type="number"
                        min="0"
                        value={matchdaySponsors}
                        onChange={(e) => setMatchdaySponsors(e.target.value)}
                        onBlur={() => commit({ matchdaySponsors: matchdaySponsors === '' ? null : Number(matchdaySponsors) })}
                        className={`${inputClass} w-20`}
                      />
                    </Field>
                    <Field label="Mascots">
                      <input
                        type="number"
                        min="0"
                        value={playerMascots}
                        onChange={(e) => setPlayerMascots(e.target.value)}
                        onBlur={() => commit({ playerMascots: playerMascots === '' ? null : Number(playerMascots) })}
                        className={`${inputClass} w-20`}
                      />
                    </Field>
                    <Field label="Walkabouts">
                      <input
                        type="number"
                        min="0"
                        value={walkabouts}
                        onChange={(e) => setWalkabouts(e.target.value)}
                        onBlur={() => commit({ walkabouts: walkabouts === '' ? null : Number(walkabouts) })}
                        className={`${inputClass} w-20`}
                      />
                    </Field>
                  </>
                )}
              </div>

              {/* Row 3: LED (base minutes) toggle. */}
              <div className="flex flex-wrap items-end gap-4 border-t border-white/10 pt-3">
                <ToggleSwitch checked={ledEnabled} onChange={toggleLed} label="LED" />
                {ledEnabled && (
                  <>
                    <Field label="LED minutes">
                      <input
                        type="number"
                        min="0"
                        value={ledMinutes}
                        onChange={(e) => setLedMinutes(e.target.value)}
                        onBlur={() => commit({ ledMinutes: ledMinutes === '' ? null : Number(ledMinutes) })}
                        className={`${inputClass} w-20`}
                      />
                    </Field>
                    <Field label="Starting MD">
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={ledStartMatchday}
                        onChange={(e) => setLedStartMatchday(e.target.value)}
                        onBlur={() => commit({ ledStartMatchday: ledStartMatchday === '' ? null : Number(ledStartMatchday) })}
                        className={`${inputClass} w-20`}
                      />
                    </Field>
                  </>
                )}
              </div>

              {/* Row 4: penalties + added time, each with its own start MD. */}
              <div className="flex flex-wrap items-end gap-4 border-t border-white/10 pt-3">
                <ToggleSwitch
                  checked={penaltyLed}
                  onChange={(v) => {
                    setPenaltyLed(v);
                    commit({ penaltyLed: v });
                  }}
                  label="LED during penalties"
                />
                {penaltyLed && (
                  <Field label="Starting MD">
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={penaltyLedStartMatchday}
                      onChange={(e) => setPenaltyLedStartMatchday(e.target.value)}
                      onBlur={() =>
                        commit({ penaltyLedStartMatchday: penaltyLedStartMatchday === '' ? null : Number(penaltyLedStartMatchday) })
                      }
                      className={`${inputClass} w-20`}
                    />
                  </Field>
                )}
                <ToggleSwitch
                  checked={addedTimeLed}
                  onChange={(v) => {
                    setAddedTimeLed(v);
                    commit({ addedTimeLed: v });
                  }}
                  label="Exclusive during added time"
                />
                {addedTimeLed && (
                  <Field label="Starting MD">
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={addedTimeLedStartMatchday}
                      onChange={(e) => setAddedTimeLedStartMatchday(e.target.value)}
                      onBlur={() =>
                        commit({
                          addedTimeLedStartMatchday: addedTimeLedStartMatchday === '' ? null : Number(addedTimeLedStartMatchday),
                        })
                      }
                      className={`${inputClass} w-20`}
                    />
                  </Field>
                )}
              </div>

              {/* Row 5: goal carpet. */}
              <div className="flex flex-wrap items-end gap-4 border-t border-white/10 pt-3">
                <ToggleSwitch
                  checked={goalCarpet}
                  onChange={(v) => {
                    setGoalCarpet(v);
                    commit({ goalCarpet: v });
                  }}
                  label="Goal carpet"
                />
                {goalCarpet && (
                  <Field label="Starting MD">
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={goalCarpetStartMatchday}
                      onChange={(e) => setGoalCarpetStartMatchday(e.target.value)}
                      onBlur={() =>
                        commit({ goalCarpetStartMatchday: goalCarpetStartMatchday === '' ? null : Number(goalCarpetStartMatchday) })
                      }
                      className={`${inputClass} w-20`}
                    />
                  </Field>
                )}
              </div>
              {saveError && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
                  {saveError}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-white/50">
              <span>Big club: {bigClub ? 'Yes' : 'No'}</span>
              <span>Derby rival: {roster.find((t) => t.slug === derbyRival)?.name ?? derbyRival ?? '-'}</span>
              {sponsored ? (
                <>
                  <span>Sponsored - matchday sponsors: {matchdaySponsors || '-'}</span>
                  <span>Player mascots: {playerMascots || '-'}</span>
                  <span>Walkabouts: {walkabouts || '-'}</span>
                </>
              ) : (
                <span>Not sponsored</span>
              )}
              <span>LED minutes per home fixture: {ledMinutes || '-'}</span>
              {ledStartMatchday && <span>LED starts matchday {ledStartMatchday}</span>}
              <span>LED during penalties: {penaltyLed ? 'Yes' : 'No'}</span>
              {penaltyLed && penaltyLedStartMatchday && <span>Starts matchday {penaltyLedStartMatchday}</span>}
              <span>Added time exclusive: {addedTimeLed ? 'Yes' : 'No'}</span>
              {addedTimeLed && addedTimeLedStartMatchday && <span>Starts matchday {addedTimeLedStartMatchday}</span>}
              <span>Goal carpet: {goalCarpet ? 'Yes' : 'No'}</span>
              {goalCarpet && goalCarpetStartMatchday && <span>Starts matchday {goalCarpetStartMatchday}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamSeasonsPanel({ session }) {
  const { teams } = useTeams();
  const { bySlug: clubsBySlug, byName: clubsByName } = useClubs();
  const { seasons } = useSeasons();
  const [selectedLabel, setSelectedLabel] = useState(null);
  const selectedSeason = seasons.find((s) => s.label === selectedLabel) ?? seasons[0];

  const { fixtures, loading: fixturesLoading, error: fixturesError } = useSeasonFixtures(
    selectedSeason ?? { label: null, tab: null },
    teams
  );
  const { rows, loading: rowsLoading, saveTeamSeason } = useTeamSeasons();
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | results array

  const roster = useMemo(() => (selectedSeason ? teamsInFixtures(fixtures) : []), [fixtures, selectedSeason]);
  const rowsByKey = useMemo(() => new Map(rows.map((r) => [r.slug, r])), [rows]);

  async function handleSyncAllSeasons() {
    setSyncStatus('syncing');
    try {
      const results = await callWithReauth(session, (token) =>
        syncAllSeasonsMatchTags({ clubsBySlug, clubsByName, teamSeasonRows: rows, seasons }, token)
      );
      setSyncStatus(results);
    } catch (err) {
      setSyncStatus([{ label: 'all seasons', ok: false, error: err.message }]);
    }
  }

  if (!selectedSeason) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-white/40">No seasons configured yet - see the "seasons" sheet tab.</p>
      </div>
    );
  }

  const loading = fixturesLoading || rowsLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Season</span>
        <select
          value={selectedSeason.label}
          onChange={(e) => setSelectedLabel(e.target.value)}
          className={`${inputClass} w-24`}
        >
          {seasons.map((s) => (
            <option key={s.label} value={s.label}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-white/40">
        Sponsorship/big-match/derby/LED designations for {selectedSeason.label} - a club with nothing set here shows
        as not sponsored/big/derby, with no LED deal, for this season.
      </p>
      {!session.signedIn && (
        <p className="text-xs text-white/50">Sign in to edit sponsorship/big-match/derby/LED designations.</p>
      )}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : fixturesError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{fixturesError}</p>
      ) : roster.length === 0 ? (
        <p className="text-xs text-white/40">No fixtures found for {selectedSeason.label} yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {roster.map((team) => (
            <TeamSeasonRow
              // Keyed on season+team, not just team, so switching season
              // always mounts a fresh row instead of reusing one whose
              // internal useState was only ever initialized from the
              // previous season's row (a club present in consecutive
              // seasons kept showing its old badges after the switch).
              key={`${selectedSeason.label}::${team.slug}`}
              season={selectedSeason.label}
              team={team}
              roster={roster}
              row={rowsByKey.get(makeId(selectedSeason.label, team.slug))}
              session={session}
              saveTeamSeason={saveTeamSeason}
            />
          ))}
        </div>
      )}
      {session.signedIn && (
        <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
          <button
            onClick={handleSyncAllSeasons}
            disabled={syncStatus === 'syncing'}
            className="self-start rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            {syncStatus === 'syncing' ? 'Syncing…' : 'Sync big match / derby tags - all seasons'}
          </button>
          <p className="text-[10px] text-white/40">
            Writes isBigMatch/isDerby to every configured season's own tab in one go - run this once after changing a
            season's sponsorship/big-club/derby designations above, rather than waiting for someone to happen to edit
            one of that season's fixture rows.
          </p>
          {Array.isArray(syncStatus) && (
            <p className="text-[10px]">
              {syncStatus.map((r, i) => (
                <span key={r.label} className={r.ok ? 'text-[#1fd8c9]' : 'text-red-300'}>
                  {i > 0 && ' · '}
                  {r.label}: {r.ok ? `${r.count} synced` : r.error}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
