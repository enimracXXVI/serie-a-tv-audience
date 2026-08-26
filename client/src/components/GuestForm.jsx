import { useEffect, useMemo, useState } from 'react';
import Dropdown from './Dropdown.jsx';
import { WORLD_NATIONS, ITALY } from '../lib/worldNations.js';
import { ITALIAN_PROVINCES } from '../lib/italianProvinces.js';
import { comuniForProvince } from '../lib/italianComuni.js';

const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

function Field({ label, className = '', children }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}

const NATION_OPTIONS = WORLD_NATIONS.map((n) => ({ value: n, label: n }));
const PROVINCE_OPTIONS = ITALIAN_PROVINCES.map((p) => ({ value: p, label: p }));

const BLANK = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  nationOfBirth: ITALY,
  provinceOfBirth: '',
  cityOfBirth: '',
  nationOfResidence: ITALY,
  provinceOfResidence: '',
  cityOfResidence: '',
};

// Province -> comune is a genuinely large dataset (~7,900 comuni - see
// italianComuni.js) loaded lazily on demand, so a province change re-fetches
// (cheap after the first time - the module itself caches the parsed JSON)
// rather than the whole list ever being held in this component's own state.
function useComuniOptions(province) {
  const [comuni, setComuni] = useState([]);

  useEffect(() => {
    if (!province) {
      setComuni([]);
      return undefined;
    }
    let cancelled = false;
    comuniForProvince(province).then((list) => {
      if (!cancelled) setComuni(list);
    });
    return () => {
      cancelled = true;
    };
  }, [province]);

  return useMemo(() => comuni.map((c) => ({ value: c, label: c })), [comuni]);
}

// `existingGuests` is the full guest list already loaded for the page (every
// match, every fixture) - deduped here by name+DOB so "reuse" offers each
// real person once regardless of how many matches they've already been
// added to.
function uniqueGuests(existingGuests) {
  const seen = new Map();
  for (const g of existingGuests) {
    const key = `${g.firstName}|${g.lastName}|${g.dateOfBirth}`;
    if (!seen.has(key)) seen.set(key, g);
  }
  return [...seen.values()].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
}

export default function GuestForm({ existingGuests, onAdd, saving }) {
  const [fields, setFields] = useState(BLANK);
  const [reuseKey, setReuseKey] = useState('');
  const [error, setError] = useState(null);

  const reusable = useMemo(() => uniqueGuests(existingGuests), [existingGuests]);
  const reuseOptions = [
    { value: '', label: 'None - new guest' },
    ...reusable.map((g, i) => ({ value: String(i), label: `${g.lastName} ${g.firstName} (${g.dateOfBirth || 'no DOB'})` })),
  ];

  function set(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  // Picking a reuse candidate prefills every field but doesn't submit
  // anything by itself - still requires "Add guest" below, same as typing
  // it all by hand, so this match's own row only gets created once you
  // actually mean it to.
  function handleReuse(key) {
    setReuseKey(key);
    if (key === '') return;
    const g = reusable[Number(key)];
    if (!g) return;
    setFields({
      firstName: g.firstName ?? '',
      lastName: g.lastName ?? '',
      dateOfBirth: g.dateOfBirth ?? '',
      nationOfBirth: g.nationOfBirth || ITALY,
      provinceOfBirth: g.provinceOfBirth ?? '',
      cityOfBirth: g.cityOfBirth ?? '',
      nationOfResidence: g.nationOfResidence || ITALY,
      provinceOfResidence: g.provinceOfResidence ?? '',
      cityOfResidence: g.cityOfResidence ?? '',
    });
  }

  const birthComuniOptions = useComuniOptions(fields.nationOfBirth === ITALY ? fields.provinceOfBirth : null);
  const residenceComuniOptions = useComuniOptions(fields.nationOfResidence === ITALY ? fields.provinceOfResidence : null);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!fields.firstName.trim() || !fields.lastName.trim()) {
      setError('Enter the guest’s first and last name.');
      return;
    }
    if (!fields.dateOfBirth) {
      setError('Enter the guest’s date of birth.');
      return;
    }
    if (fields.nationOfBirth === ITALY && (!fields.provinceOfBirth || !fields.cityOfBirth)) {
      setError('Pick a province and city of birth.');
      return;
    }
    if (fields.nationOfResidence === ITALY && (!fields.provinceOfResidence || !fields.cityOfResidence)) {
      setError('Pick a province and city of residence.');
      return;
    }
    onAdd({
      ...fields,
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      // Blank rather than carrying over a stale province/city from before a
      // nation switch away from Italy - resolveClub-style "only meaningful
      // for the applicable rows" convention used everywhere else in this app.
      provinceOfBirth: fields.nationOfBirth === ITALY ? fields.provinceOfBirth : '',
      cityOfBirth: fields.nationOfBirth === ITALY ? fields.cityOfBirth : '',
      provinceOfResidence: fields.nationOfResidence === ITALY ? fields.provinceOfResidence : '',
      cityOfResidence: fields.nationOfResidence === ITALY ? fields.cityOfResidence : '',
    });
    setFields(BLANK);
    setReuseKey('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 shadow-inner">
      {reusable.length > 0 && (
        <Field label="Reuse a previous guest">
          <Dropdown variant="light" value={reuseKey} onChange={handleReuse} options={reuseOptions} />
        </Field>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Field label="First name" className="w-36">
          <input type="text" value={fields.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Last name" className="w-36">
          <input type="text" value={fields.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Date of birth" className="w-36">
          <input type="date" value={fields.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Nation of birth" className="w-40">
          <Dropdown variant="light" value={fields.nationOfBirth} onChange={(v) => set('nationOfBirth', v)} options={NATION_OPTIONS} />
        </Field>
        {fields.nationOfBirth === ITALY && (
          <>
            <Field label="Province of birth" className="w-40">
              <Dropdown
                variant="light"
                value={fields.provinceOfBirth}
                onChange={(v) => {
                  set('provinceOfBirth', v);
                  set('cityOfBirth', '');
                }}
                options={PROVINCE_OPTIONS}
              />
            </Field>
            <Field label="City of birth" className="w-40">
              <Dropdown
                variant="light"
                value={fields.cityOfBirth}
                onChange={(v) => set('cityOfBirth', v)}
                options={birthComuniOptions.length > 0 ? birthComuniOptions : [{ value: '', label: 'Pick a province first' }]}
              />
            </Field>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Nation of residence" className="w-40">
          <Dropdown
            variant="light"
            value={fields.nationOfResidence}
            onChange={(v) => set('nationOfResidence', v)}
            options={NATION_OPTIONS}
          />
        </Field>
        {fields.nationOfResidence === ITALY && (
          <>
            <Field label="Province of residence" className="w-40">
              <Dropdown
                variant="light"
                value={fields.provinceOfResidence}
                onChange={(v) => {
                  set('provinceOfResidence', v);
                  set('cityOfResidence', '');
                }}
                options={PROVINCE_OPTIONS}
              />
            </Field>
            <Field label="City of residence" className="w-40">
              <Dropdown
                variant="light"
                value={fields.cityOfResidence}
                onChange={(v) => set('cityOfResidence', v)}
                options={residenceComuniOptions.length > 0 ? residenceComuniOptions : [{ value: '', label: 'Pick a province first' }]}
              />
            </Field>
          </>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-[#1fd8c9] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0f1e54] shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add guest'}
      </button>
    </form>
  );
}
