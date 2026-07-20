import Crest from './Crest.jsx';
import { DaznLogo, SkyLogo } from './BroadcastBadges.jsx';
import SponsorBadges from './SponsorBadges.jsx';
import { matchTagStyle } from '../lib/matchTags.js';

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 11.5L12 4l8 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9h12v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.5 14.5 4 12.5l1-1.5 8 1.5 3.5-5c.5-.7 1.3-1 2-.6.6.4.8 1.2.4 1.9l-3 5.2 1.7 7.7-1.6.8-3.3-6.6-2.7 3.6.3 2.4-1.2.7-1.6-3.1z" />
    </svg>
  );
}

function ScoreDisplay({ usScore, themScore }) {
  const played = usScore !== null && usScore !== undefined && themScore !== null && themScore !== undefined;
  return (
    <div className="flex items-center gap-1 text-sm font-bold text-[#0f1e54]">
      <span className="w-6 text-center">{played ? usScore : '-'}</span>
      <span className="text-gray-300 text-xs">-</span>
      <span className="w-6 text-center">{played ? themScore : '-'}</span>
    </div>
  );
}

// Deliberately one uniform (not viewport-responsive) size: this row lands
// inside CSS columns whose actual rendered width has nothing to do with the
// viewport width - a "desktop" sm: breakpoint would fire while the card
// itself is still narrow, squeezing the opponent name to nothing.
export default function TeamFixtureRow({ fixture, team }) {
  const isHome = fixture.home.slug === team.slug;
  const opponent = isHome ? fixture.away : fixture.home;
  const dateShort = formatDateShort(fixture.date);
  const usScore = isHome ? fixture.homeScore : fixture.awayScore;
  const themScore = isHome ? fixture.awayScore : fixture.homeScore;
  const sponsorFlags = isHome
    ? { matchdaySponsor: fixture.homeMatchdaySponsor, playerMascot: fixture.homePlayerMascot, walkabout: fixture.homeWalkabout }
    : { matchdaySponsor: fixture.awayMatchdaySponsor, playerMascot: fixture.awayPlayerMascot, walkabout: fixture.awayWalkabout };
  const tagStyle = matchTagStyle(fixture);

  return (
    <div className="flex items-stretch" style={{ background: tagStyle.background }}>
      <div className="w-1.5 shrink-0" style={{ background: tagStyle.bar }} />
      <div className="flex flex-1 items-center gap-1.5 px-2 py-2">
        <div className="w-8 shrink-0 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">
          MD{fixture.matchday}
        </div>

        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center text-center text-[9px] leading-tight text-gray-400">
          {dateShort && <div>{dateShort}</div>}
          {(fixture.day || fixture.kickoffTime) && (
            <div>{[fixture.day, fixture.kickoffTime].filter(Boolean).join(' ')}</div>
          )}
          {tagStyle.labels.map((l) => (
            <div key={l.text} className={`font-black ${l.className}`}>
              {l.text}
            </div>
          ))}
        </div>

        <div className="flex w-5 shrink-0 justify-center text-gray-400" title={isHome ? 'Home' : 'Away'}>
          {isHome ? <HomeIcon /> : <PlaneIcon />}
        </div>

        <div className="flex flex-1 items-center gap-1.5 min-w-0">
          <Crest team={opponent} size={22} />
          <span className="truncate text-xs font-semibold text-[#0f1e54]">{opponent.name}</span>
          <SponsorBadges {...sponsorFlags} />
        </div>

        <div className="shrink-0 rounded-md px-1 py-1">
          <ScoreDisplay usScore={usScore} themScore={themScore} />
        </div>

        <div className="flex w-10 shrink-0 items-center gap-1">
          <DaznLogo height={13} />
          {fixture.onSky && <SkyLogo height={13} compact />}
        </div>
      </div>
    </div>
  );
}
