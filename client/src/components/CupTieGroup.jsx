import Crest from './Crest.jsx';
import CupFixtureRow from './CupFixtureRow.jsx';
import { computeTieAggregate } from '../lib/cupFixtures.js';

// The winner's score always reads first ("Bologna win 5-1", not "1-5") -
// aggregate.aScore/bScore are fixed to leg 1's home/away club regardless of
// who actually won, so the higher score has to be picked out and put first
// rather than printed in that raw order.
function aggregateSummary(aggregate) {
  const { aScore, bScore, teamA, teamB, decidedByPens, penAScore, penBScore } = aggregate;
  if (aScore === bScore && !decidedByPens) {
    return `${aScore}-${bScore} agg · Tied`;
  }
  if (decidedByPens) {
    const aWon = penAScore > penBScore;
    const winner = aWon ? teamA : teamB;
    const [winScore, loseScore] = aWon ? [penAScore, penBScore] : [penBScore, penAScore];
    return `${aScore}-${bScore} agg · ${winner.name} win on penalties (${winScore}-${loseScore})`;
  }
  const aWon = aScore > bScore;
  const winner = aWon ? teamA : teamB;
  const [winScore, loseScore] = aWon ? [aScore, bScore] : [bScore, aScore];
  return `${winner.name} win ${winScore}-${loseScore} on aggregate`;
}

// Renders a two-legged tie's two CupFixtureRows together with an aggregate
// summary underneath, once both legs have been played - see
// groupIntoTies/computeTieAggregate in cupFixtures.js for how legs are
// matched and the aggregate (post-ET) score is derived.
export default function CupTieGroup({ legs, onUpdate, onDelete, canEdit, editMode, broadcasters }) {
  const sorted = [...legs].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  const aggregate = computeTieAggregate(sorted);

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {sorted.map((f, i) => (
        <CupFixtureRow
          key={f.id}
          fixture={f}
          onUpdate={onUpdate}
          onDelete={onDelete}
          canEdit={canEdit}
          editMode={editMode}
          broadcasters={broadcasters}
          legLabel={i === 0 ? '1st leg' : '2nd leg'}
        />
      ))}
      {aggregate && (
        <div className="flex items-center justify-center gap-2 bg-gray-50 px-3 py-1.5 text-center text-xs font-bold text-[#0f1e54]">
          <Crest team={aggregate.teamA} size={16} />
          <span>{aggregateSummary(aggregate)}</span>
          <Crest team={aggregate.teamB} size={16} />
        </div>
      )}
    </div>
  );
}
