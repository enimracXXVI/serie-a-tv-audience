import Crest from './Crest.jsx';
import CupFixtureRow from './CupFixtureRow.jsx';
import { computeTieAggregate } from '../lib/cupFixtures.js';

const ACCENT = '#b91c1c';

// The winner's score always reads first ("Bologna win 5-1", not "1-5") -
// aggregate.aScore/bScore are fixed to leg 1's home/away club regardless of
// who actually won, so the higher score has to be picked out and put first
// rather than printed in that raw order. Split into pieces (rather than one
// string) so the winner's crest can sit right before their own name, not
// flanking the whole line - there's no "other side" crest for a tie with no
// winner to show.
function aggregateParts(aggregate) {
  const { aScore, bScore, teamA, teamB, decidedByPens, penAScore, penBScore } = aggregate;
  if (aScore === bScore && !decidedByPens) {
    return { before: `${aScore}-${bScore} agg · Tied`, winner: null, after: '' };
  }
  if (decidedByPens) {
    const aWon = penAScore > penBScore;
    const winner = aWon ? teamA : teamB;
    const [winScore, loseScore] = aWon ? [penAScore, penBScore] : [penBScore, penAScore];
    return { before: `${aScore}-${bScore} agg · `, winner, after: ` win on penalties (${winScore}-${loseScore})` };
  }
  const aWon = aScore > bScore;
  const winner = aWon ? teamA : teamB;
  const [winScore, loseScore] = aWon ? [aScore, bScore] : [bScore, aScore];
  return { before: '', winner, after: ` win ${winScore}-${loseScore} on aggregate` };
}

// Renders a two-legged tie's two CupFixtureRows together with an aggregate
// summary underneath, once both legs have been played - see
// groupIntoTies/computeTieAggregate in cupFixtures.js for how legs are
// matched and the aggregate (post-ET) score is derived.
export default function CupTieGroup({ legs, onUpdate, onDelete, canEdit, editMode, broadcasters }) {
  const sorted = [...legs].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  const aggregate = computeTieAggregate(sorted);
  const { before, winner, after } = aggregate ? aggregateParts(aggregate) : {};

  return (
    <div className="flex flex-col">
      {sorted.map((f, i) => (
        <div key={f.id} style={i > 0 ? { borderTop: `1px solid ${ACCENT}33` } : undefined}>
          <CupFixtureRow
            fixture={f}
            onUpdate={onUpdate}
            onDelete={onDelete}
            canEdit={canEdit}
            editMode={editMode}
            broadcasters={broadcasters}
            legLabel={i === 0 ? '1st leg' : '2nd leg'}
          />
        </div>
      ))}
      {aggregate && (
        <div className="flex items-center justify-center gap-1 bg-red-50 px-3 py-1.5 text-center text-xs font-bold text-[#0f1e54]">
          {before && <span>{before}</span>}
          {winner && <Crest team={winner} size={16} />}
          {winner && <span>{winner.name}</span>}
          {after && <span>{after}</span>}
        </div>
      )}
    </div>
  );
}
