import CupFixtureRow from './CupFixtureRow.jsx';
import { computeTieAggregate } from '../lib/cupFixtures.js';

// Renders a two-legged tie's two CupFixtureRows together with an aggregate
// summary underneath, once both legs have been played - see
// groupIntoTies/computeTieAggregate in cupFixtures.js for how legs are
// matched and the aggregate (post-ET) score is derived.
export default function CupTieGroup({ legs, onUpdate, onDelete, canEdit, editMode, broadcasters }) {
  const sorted = [...legs].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  const aggregate = computeTieAggregate(sorted);

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {sorted.map((f) => (
        <CupFixtureRow
          key={f.id}
          fixture={f}
          onUpdate={onUpdate}
          onDelete={onDelete}
          canEdit={canEdit}
          editMode={editMode}
          broadcasters={broadcasters}
        />
      ))}
      {aggregate && (
        <div className="bg-gray-50 px-3 py-1.5 text-center text-xs font-bold text-[#0f1e54]">
          {aggregate.aScore === aggregate.bScore && aggregate.decidedByPens
            ? `${aggregate.aScore}-${aggregate.bScore} agg · ${aggregate.penAScore > aggregate.penBScore ? aggregate.teamA.name : aggregate.teamB.name} win on penalties (${aggregate.penAScore}-${aggregate.penBScore})`
            : `${
                aggregate.aScore > aggregate.bScore
                  ? aggregate.teamA.name
                  : aggregate.bScore > aggregate.aScore
                    ? aggregate.teamB.name
                    : 'Tied'
              } ${aggregate.aScore === aggregate.bScore ? '' : 'win '}${aggregate.aScore}-${aggregate.bScore} on aggregate`}
        </div>
      )}
    </div>
  );
}
