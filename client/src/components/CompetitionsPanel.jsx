import { useState } from 'react';
import { useCupData } from '../lib/useCupData.jsx';
import { competitionScope, SERIE_A_VALUE } from '../lib/competitions.js';
import { callWithReauth } from '../lib/reauth.js';
import { useConfirm } from '../lib/useConfirm.jsx';
import PencilEditOverlay from './PencilEditOverlay.jsx';
import Dropdown from './Dropdown.jsx';

const SCOPE_OPTIONS = [
  { value: 'national', label: 'National' },
  { value: 'european', label: 'European' },
];

// Rectangular logo preview box - a competition/broadcaster logotype is
// typically a wide wordmark, not an icon, so it stays object-contain in a
// plain box rather than getting cropped into a circle like a team crest.
function LogoPreview({ url, size = 'h-9 w-16' }) {
  return (
    <div className={`flex ${size} items-center justify-center rounded-md bg-white/10`}>
      {url ? (
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="text-[9px] font-semibold uppercase text-white/30">Logo</span>
      )}
    </div>
  );
}

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

// Serie A is a real row in the "competitions" tab (see competitions.js), but
// gets a simplified block here - just the logo, no name edit or scope
// selector (its name is fixed, and scope only matters for filtering
// cup-fixture opponents, which Serie A never is).
function SerieARow({ competition, session, saveCompetition }) {
  const [error, setError] = useState(null);

  async function commit(logoURL) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCompetition(SERIE_A_VALUE, { logoURL }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!competition) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-3">
        {session.signedIn ? (
          <PencilEditOverlay value={competition.logoURL} onCommit={commit} rounded="rounded-md">
            <LogoPreview url={competition.logoURL} />
          </PencilEditOverlay>
        ) : (
          <LogoPreview url={competition.logoURL} />
        )}
        <span className="text-sm font-semibold text-white">Serie A</span>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Clicking the logo's pencil edits both the logo URL and the competition's
// name together, rather than just the logo - a competition's name is just
// as likely to need a fix (typo, rename) as its logo.
function EditableCompetitionHeader({ competition, onSave }) {
  const [editing, setEditing] = useState(false);
  const [logoDraft, setLogoDraft] = useState(competition.logoURL ?? '');
  const [nameDraft, setNameDraft] = useState(competition.name ?? '');

  function startEditing() {
    setLogoDraft(competition.logoURL ?? '');
    setNameDraft(competition.name ?? '');
    setEditing(true);
  }

  function save() {
    setEditing(false);
    const fields = {};
    if (logoDraft !== (competition.logoURL ?? '')) fields.logoURL = logoDraft;
    if (nameDraft !== (competition.name ?? '')) fields.name = nameDraft;
    if (Object.keys(fields).length > 0) onSave(fields);
  }

  if (editing) {
    return (
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        <input
          type="text"
          autoFocus
          value={logoDraft}
          onChange={(e) => setLogoDraft(e.target.value)}
          placeholder="Logo URL"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="Name"
          className={`${inputClass} w-32`}
        />
        <button type="button" onClick={save} className="shrink-0 rounded-md bg-[#1fd8c9] px-2.5 py-1 text-xs font-bold text-[#0f1e54] hover:brightness-95">
          Save
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={startEditing} className="flex items-center gap-3" title="Click to edit logo/name">
      <span className="relative inline-flex shrink-0">
        <LogoPreview url={competition.logoURL} />
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md bg-[#1fd8c9] text-[#0f1e54] shadow ring-2 ring-[#0f1e54]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
            <path d="M13.7 2.3a1.5 1.5 0 0 1 2.12 0l1.88 1.88a1.5 1.5 0 0 1 0 2.12L7.4 16.6l-4.2.9.9-4.2Zm-1.06 2.12L4.9 12.16l-.45 2.1 2.1-.45 7.74-7.74Z" />
          </svg>
        </span>
      </span>
      <span className="text-sm font-semibold text-white">{competition.name}</span>
    </button>
  );
}

function CompetitionRow({ competition, session, saveCompetition, removeCompetition }) {
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  async function commit(fields) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCompetition(competition.slug, fields, token));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!(await confirm(`Delete "${competition.name}"? This can't be undone from here - you'd need to re-add it by hand.`))) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await callWithReauth(session, (token) => removeCompetition(competition.slug, token));
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/5 px-3 py-2">
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-3">
        <EditableCompetitionHeader competition={competition} onSave={commit} />
        <Dropdown variant="sidebar" className="w-32" value={competitionScope(competition)} onChange={(scope) => commit({ scope })} options={SCOPE_OPTIONS} />
        {session.signedIn && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto w-fit rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-semibold uppercase text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function CompetitionsPanel({ session }) {
  const { competitions, loading, error, saveCompetition, createCompetition, removeCompetition } = useCupData();
  const serieA = competitions.find((c) => c.slug === SERIE_A_VALUE);
  const cupCompetitions = competitions.filter((c) => c.slug !== SERIE_A_VALUE);
  const [newName, setNewName] = useState('');
  const [newLogoURL, setNewLogoURL] = useState('');
  const [newScope, setNewScope] = useState('national');
  const [createError, setCreateError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Enter a competition name.');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createCompetition(
          { slug: slugify(newName), name: newName.trim(), logoURL: newLogoURL.trim(), scope: newScope },
          token
        )
      );
      setNewName('');
      setNewLogoURL('');
      setNewScope('national');
    } catch (err) {
      setCreateError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit competition logos.</p>}
      {session.signedIn && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className={`self-start rounded-full px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
              showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Add competition {showAddForm ? '▴' : '▾'}
          </button>
          {showAddForm && (
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New competition name"
                className={`${inputClass} w-48`}
              />
              <input
                type="text"
                value={newLogoURL}
                onChange={(e) => setNewLogoURL(e.target.value)}
                placeholder="Logo image URL (optional)"
                className={`${inputClass} w-56`}
              />
              <Dropdown variant="sidebar" value={newScope} onChange={setNewScope} options={SCOPE_OPTIONS} />
              <button type="submit" className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95">
                Add
              </button>
            </form>
          )}
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <SerieARow competition={serieA} session={session} saveCompetition={saveCompetition} />
          {cupCompetitions.map((c) => (
            <CompetitionRow
              key={c.slug}
              competition={c}
              session={session}
              saveCompetition={saveCompetition}
              removeCompetition={removeCompetition}
            />
          ))}
        </div>
      )}
    </div>
  );
}
