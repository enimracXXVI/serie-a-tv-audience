import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BrandedCalendarPage from './pages/BrandedCalendarPage.jsx';
import StandingsPage from './pages/StandingsPage.jsx';
import HamburgerMenu from './components/HamburgerMenu.jsx';
import { TeamsProvider } from './lib/useTeams.jsx';

export default function App() {
  return (
    <TeamsProvider>
      <HamburgerMenu />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/calendar/:teams" element={<BrandedCalendarPage />} />
        <Route path="/standings" element={<StandingsPage />} />
      </Routes>
    </TeamsProvider>
  );
}
