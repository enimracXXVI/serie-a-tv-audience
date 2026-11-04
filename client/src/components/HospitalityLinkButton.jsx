import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/useSession.jsx';

// Jumps straight to this fixture's own guest list on the Hospitality page -
// a small, separate affordance next to DELETE/edit controls rather than
// repurposing the row's own click (which already toggles the edit box) or
// hijacking the whole row, so it can't fight either.
//
// Signed out, this renders nothing at all - no disabled button, no sign-in
// nag, just nothing ("if not logged in nothing happens"), since hospitality
// access is unrelated to whatever page happens to link to it.
export default function HospitalityLinkButton({ fixtureId, competition, className = '' }) {
  const session = useSession();
  const navigate = useNavigate();

  if (!session.signedIn) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/hospitality?fixture=${fixtureId}&competition=${encodeURIComponent(competition)}`)}
      title="Open this match's hospitality guest list"
      aria-label="Open hospitality"
      className={`shrink-0 rounded-lg border border-[#1fd8c9]/40 bg-white px-2.5 py-1 text-xs font-bold text-[#1fd8c9] shadow-sm transition-colors hover:bg-[#1fd8c9]/10 ${className}`}
    >
      🎟
    </button>
  );
}
