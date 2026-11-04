// Converts a plain "YYYY-MM-DD" string (the shape <input type="date"> and
// the sheet both store internally) to "DD/MM/YYYY" - every day-first
// website this data ever gets copy-pasted into (see HospitalityPage/
// exportHospitalityCsv) expects that order, not ISO's year-first one.
export function isoToDDMMYYYY(isoDate) {
  if (!isoDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

// Today's own date as the same "YYYY-MM-DD" shape fixtures store - in the
// viewer's LOCAL calendar day, not UTC, so "today" matches what the clock
// on the wall actually says regardless of time zone.
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}
