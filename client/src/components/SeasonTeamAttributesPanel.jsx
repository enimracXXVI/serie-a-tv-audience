import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import { useTeams } from '../lib/useTeams.jsx';
import { useOtherClubs } from '../lib/useOtherClubs.jsx';
import { useSeasonFixtures } from '../lib/useSeasonFixtures.js';
import { useSeasonTeamAttributes } from '../lib/useSeasonTeamAttributes.jsx';
import { teamsInFixtures } from '../lib/teams.js';
import { makeId } from '../lib/seasonTeamAttributes.js';
import { SEASONS } from '../lib/seasons.js';
import { callWithReauth } from '../lib/reauth.js';
import { syncAllSeasonsMatchTags } from '../lib/syncSeasonTags.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9]';

function SeasonTeamRow({ season, team, roster, row, session, saveSeasonTeamAttribute }) {
  const [expanded, setExpanded] = useState(false);
  const [sponsored, setSponsored] = useState(Boolean(row?.sponsored));
  const [bigClub, setBigClub] = useState(Boolean(row?.bigClub));
  const [derbyRival, setDerbyRival] = useState(row?.derbyRival || '');
  const [saveError, setSaveError] = useState(null);
  const name = team.staticName ?? team.name;

  async function commit(fields) {
    setSaveError(null);
    try {
      await callWithReauth(session, (token) => saveSeasonTeamAttribute(season, name, fields, token));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  return (
    <div className="rounded-lg bg-white/5">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <Crest team={team} size={26} />
        <span className="flex-1 text-sm font-bold text-white">{team.name}</span>
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
        <span className="text-white/40">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3">
          {session.signedIn ? (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sponsored}
                    onChange={(e) => {
                      setSponsored(e.target.checked);
                      commit({ sponsored: e.target.checked });
                    }}
                    className="h-4 w-4 accent-[#1fd8c9]"
                  />
                  <span className="text-xs font-semibold text-white/70">Sponsored in {season}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bigClub}
                    onChange={(e) => {
                      setBigClub(e.target.checked);
                      commit({ bigClub: e.target.checked });
                    }}
                    className="h-4 w-4 accent-[#1fd8c9]"
                  />
                  <span className="text-xs font-semibold text-white/70">Big club in {season}</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Derby rival in {season}
                  </span>
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
                        <option key={t.slug} value={t.staticName ?? t.name}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {saveError && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
                  {saveError}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-white/50">
              <span>Sponsored: {sponsored ? 'Yes' : 'No'}</span>
              <span>Big club: {bigClub ? 'Yes' : 'No'}</span>
              <span>Derby rival: {derbyRival || '-'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeasonTeamAttributesPanel({ session }) {
  const { teams } = useTeams();
  const { byName: otherClubsByName } = useOtherClubs();
  const archiveSeasons = useMemo(() => SEASONS.filter((s) => s.tab), []);
  const [selectedLabel, setSelectedLabel] = useState(archiveSeasons[0]?.label ?? null);
  const selectedSeason = archiveSeasons.find((s) => s.label === selectedLabel) ?? archiveSeasons[0];

  const { fixtures, loading: fixturesLoading, error: fixturesError } = useSeasonFixtures(
    selectedSeason ?? { label: null, tab: null },
    teams
  );
  const { rows, loading: rowsLoading, saveSeasonTeamAttribute } = useSeasonTeamAttributes();
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | results array

  const roster = useMemo(() => (selectedSeason ? teamsInFixtures(fixtures) : []), [fixtures, selectedSeason]);
  const rowsByKey = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const teamByName = useMemo(() => new Map(teams.map((t) => [t.staticName, t])), [teams]);

  async function handleSyncAllSeasons() {
    setSyncStatus('syncing');
    try {
      const results = await callWithReauth(session, (token) =>
        syncAllSeasonsMatchTags({ teamByName, otherClubsByName, seasonAttributeRows: rows }, token)
      );
      setSyncStatus(results);
    } catch (err) {
      setSyncStatus([{ label: 'all seasons', ok: false, error: err.message }]);
    }
  }

  if (!selectedSeason) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-white/40">No archive seasons configured yet - see lib/seasons.js.</p>
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
          {archiveSeasons.map((s) => (
            <option key={s.label} value={s.label}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-white/40">
        Only applies to {selectedSeason.label} - the live season's sponsorship/big-club/derby settings stay in{' '}
        <strong>Team settings</strong> above. A club with nothing set here shows as not sponsored/big/derby for this
        season, regardless of its current live setting.
      </p>
      {!session.signedIn && (
        <p className="text-xs text-white/50">Sign in to edit past-season sponsorship/big-match/derby designations.</p>
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
            <SeasonTeamRow
              key={team.slug}
              season={selectedSeason.label}
              team={team}
              roster={roster}
              row={rowsByKey.get(makeId(selectedSeason.label, team.staticName ?? team.name))}
              session={session}
              saveSeasonTeamAttribute={saveSeasonTeamAttribute}
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
            past season's sponsorship/big-club/derby designations above, rather than waiting for someone to happen to
            edit one of that season's fixture rows.
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
