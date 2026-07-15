import Crest from './Crest.jsx';

export default function TeamPicker({ teams, selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
      {teams.map((team) => {
        const isActive = selected.includes(team.slug);
        return (
          <button
            key={team.slug}
            onClick={() => onToggle(team.slug)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all ${
              isActive
                ? 'border-white/70 bg-white/10 shadow-[0_0_0_2px_rgba(255,255,255,0.15)]'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/25'
            }`}
          >
            <Crest team={team} size={30} />
            <span className={`text-[11px] font-medium ${isActive ? 'text-white' : 'text-white/60'}`}>
              {team.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}
