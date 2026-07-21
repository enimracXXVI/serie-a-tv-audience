import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BrandedCalendarPage from './pages/BrandedCalendarPage.jsx';
import StandingsPage from './pages/StandingsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CupCompetitionsPage from './pages/CupCompetitionsPage.jsx';
import HamburgerMenu from './components/HamburgerMenu.jsx';
import { ClubsProvider } from './lib/useClubs.jsx';
import { CupDataProvider } from './lib/useCupData.jsx';
import { SeasonsProvider } from './lib/useSeasons.jsx';
import { TeamSeasonsProvider } from './lib/useTeamSeasons.jsx';
import { SessionProvider } from './lib/useSession.jsx';

export default function App() {
  return (
    <SessionProvider>
      <SeasonsProvider>
        <ClubsProvider>
          <TeamSeasonsProvider>
            <CupDataProvider>
              <HamburgerMenu />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/calendar/:teams" element={<BrandedCalendarPage />} />
                <Route path="/standings" element={<StandingsPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/cup" element={<CupCompetitionsPage />} />
              </Routes>
            </CupDataProvider>
          </TeamSeasonsProvider>
        </ClubsProvider>
      </SeasonsProvider>
    </SessionProvider>
  );
}
