import CupFixtureRow from './CupFixtureRow.jsx';
import { computeTieAggregate } from '../lib/cupFixtures.js';

// Renders a two-legged tie's two CupFixtureRows together with an aggregate
// summary underneath, once both legs have been played - see
// groupIntoTies/computeTieAggregate in cupFixtures.js for how legs are
// matched and the aggregate (post-ET) score is derived.
export default function CupTieGroup({ legs, onUpdate, canEdit, broadcasters }) {
  const sorted = [...legs].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  const aggregate = computeTieAggregate(sorted);
  const ourClubName = sorted[0].ourClub.name;
  const opponentName = sorted[0].opponent.name;

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {sorted.map((f) => (
        <CupFixtureRow key={f.id} fixture={f} onUpdate={onUpdate} canEdit={canEdit} broadcasters={broadcasters} />
      ))}
      {aggregate && (
        <div className="bg-gray-50 px-3 py-1.5 text-center text-xs font-bold text-[#0f1e54]">
          {aggregate.ourAgg === aggregate.theirAgg && aggregate.decidedByPens
            ? `${aggregate.ourAgg}-${aggregate.theirAgg} agg · ${aggregate.penOurScore > aggregate.penTheirScore ? ourClubName : opponentName} win on penalties (${aggregate.penOurScore}-${aggregate.penTheirScore})`
            : `${aggregate.ourAgg > aggregate.theirAgg ? ourClubName : aggregate.theirAgg > aggregate.ourAgg ? opponentName : 'Tied'} ${
                aggregate.ourAgg === aggregate.theirAgg ? '' : 'win '
              }${aggregate.ourAgg}-${aggregate.theirAgg} on aggregate`}
        </div>
      )}
    </div>
  );
}
