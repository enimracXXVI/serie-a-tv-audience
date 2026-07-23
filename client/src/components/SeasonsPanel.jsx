import { useState } from 'react';
import { useSeasons } from '../lib/useSeasons.jsx';
import { callWithReauth } from '../lib/reauth.js';
import { useConfirm } from '../lib/useConfirm.jsx';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function slugify(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function SeasonRow({ season, session, saveSeason, onSetCurrent, removeSeason }) {
  const [tab, setTab] = useState(season.tab ?? '');
  const [slug, setSlug] = useState(season.slug ?? '');
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  async function commit(fields) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveSeason(season.label, fields, token));
    } catch (err) {
      setError(err.message);
    }
  }

  async function setCurrent() {
    setError(null);
    try {
      await onSetCurrent(season.label);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (
      !(await confirm(`Delete season "${season.label}"? This can't be undone from here - you'd need to re-add it by hand.`))
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await callWithReauth(session, (token) => removeSeason(season.label, token));
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/5 px-3 py-2">
      {confirmDialog}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{season.label}</span>
        {season.current && (
          <span className="rounded-full bg-[#1fd8c9]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1fd8c9]">
            Current
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Fixtures tab</span>
          <input
            type="text"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            onBlur={() => tab !== (season.tab ?? '') && commit({ tab })}
            placeholder="fixtures_26_27"
            className={`${inputClass} w-40`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">URL slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={() => slug !== (season.slug ?? '') && commit({ slug })}
            placeholder="26-27"
            className={`${inputClass} w-28`}
          />
        </label>
      </div>
      {session.signedIn && !season.current && (
        <button onClick={setCurrent} className="self-start text-[10px] font-semibold text-white/50 hover:text-white">
          Set as current season
        </button>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
      {session.signedIn && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-fit rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete season'}
        </button>
      )}
    </div>
  );
}

export default function SeasonsPanel({ session }) {
  const { seasons, loading, saveSeason, createSeason, removeSeason } = useSeasons();
  const [newLabel, setNewLabel] = useState('');
  const [newTab, setNewTab] = useState('');
  const [createError, setCreateError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    const trimmed = newLabel.trim();
    if (!trimmed) {
      setCreateError('Enter a season label, e.g. 27/28.');
      return;
    }
    if (!newTab.trim()) {
      setCreateError("Enter that season's fixtures tab name, e.g. fixtures_27_28 - create the tab itself in the sheet first.");
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createSeason(
          { label: trimmed, tab: newTab.trim(), slug: slugify(trimmed), current: false },
          token
        )
      );
      setNewLabel('');
      setNewTab('');
    } catch (err) {
      setCreateError(err.message);
    }
  }

  async function handleSetCurrent(label) {
    const prevCurrent = seasons.find((s) => s.current);
    await callWithReauth(session, async (token) => {
      if (prevCurrent && prevCurrent.label !== label) {
        await saveSeason(prevCurrent.label, { current: false }, token);
      }
      await saveSeason(label, { current: true }, token);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/40">
        Every season the app knows about, live or archived. Exactly one should be <strong>current</strong> - that's
        the season Fixtures/Standings/Dashboard/Cups default to, and the tab actively written to when a game is
        edited or added. Creating a season here only registers it - you still need to create its fixtures tab in the
        sheet by hand (copy the current tab's header row) before picking it here.
      </p>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit seasons.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {seasons.map((s) => (
            <SeasonRow
              key={s.label}
              season={s}
              session={session}
              saveSeason={saveSeason}
              onSetCurrent={handleSetCurrent}
              removeSeason={removeSeason}
            />
          ))}
          {session.signedIn && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className={`self-start rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Add season {showAddForm ? '▴' : '▾'}
              </button>
              {showAddForm && (
                <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Label</span>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="27/28"
                      className={`${inputClass} w-24`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Fixtures tab</span>
                    <input
                      type="text"
                      value={newTab}
                      onChange={(e) => setNewTab(e.target.value)}
                      placeholder="fixtures_27_28"
                      className={`${inputClass} w-40`}
                    />
                  </label>
                  <button type="submit" className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95">
                    Add
                  </button>
                </form>
              )}
            </div>
          )}
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
    </div>
  );
}
