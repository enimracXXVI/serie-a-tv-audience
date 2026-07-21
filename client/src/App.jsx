import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BrandedCalendarPage from './pages/BrandedCalendarPage.jsx';
import StandingsPage from './pages/StandingsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CupCompetitionsPage from './pages/CupCompetitionsPage.jsx';
import HamburgerMenu from './components/HamburgerMenu.jsx';
import { TeamsProvider } from './lib/useTeams.jsx';
import { CupDataProvider } from './lib/useCupData.jsx';
import { OtherClubsProvider } from './lib/useOtherClubs.jsx';
import { SeasonTeamAttributesProvider } from './lib/useSeasonTeamAttributes.jsx';
import { AppSettingsProvider } from './lib/useAppSettings.jsx';
import { SessionProvider } from './lib/useSession.jsx';

export default function App() {
  return (
    <SessionProvider>
      <AppSettingsProvider>
        <TeamsProvider>
          <OtherClubsProvider>
            <SeasonTeamAttributesProvider>
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
            </SeasonTeamAttributesProvider>
          </OtherClubsProvider>
        </TeamsProvider>
      </AppSettingsProvider>
    </SessionProvider>
  );
}
