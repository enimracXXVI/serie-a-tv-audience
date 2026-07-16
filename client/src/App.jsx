import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BrandedCalendarPage from './pages/BrandedCalendarPage.jsx';
import HamburgerMenu from './components/HamburgerMenu.jsx';

export default function App() {
  return (
    <>
      <HamburgerMenu />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/calendar/:teams" element={<BrandedCalendarPage />} />
      </Routes>
    </>
  );
}
