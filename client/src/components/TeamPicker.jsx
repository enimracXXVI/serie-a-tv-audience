import Crest from './Crest.jsx';

const DEFAULT_GRID = 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2';

export default function TeamPicker({ teams, selected, onToggle, gridClassName = DEFAULT_GRID }) {
  return (
    <div className={gridClassName}>
      {teams.map((team) => {
        const isActive = selected.includes(team.slug);
        return (
          <button
            key={team.slug}
            onClick={() => onToggle(team.slug)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 bg-white px-2 py-3 shadow-sm transition-all ${
              isActive ? 'border-[#1fd8c9] shadow-md' : 'border-transparent hover:border-[#1fd8c9]/40'
            }`}
          >
            <Crest team={team} size={30} />
            <span className={`text-[11px] font-medium ${isActive ? 'text-[#0f1e54] font-bold' : 'text-gray-500'}`}>
              {team.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}
