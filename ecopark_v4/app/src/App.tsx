import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Landing from './pages/Landing';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ParkingBrowse from './pages/ParkingBrowse';
import BookingFlow from './pages/BookingFlow';
import MyBookings from './pages/MyBookings';
import EVCharging from './pages/EVCharging';
import Profile from './pages/Profile';
import EnergyMonitor from './pages/EnergyMonitor';
import MapView from './pages/MapView';
import QRAccess from './pages/QRAccess';
import './App.css';

type Theme = 'light' | 'dark';
const THEME_KEY = 'ecopark_theme';

function AppRouter() {
  const { view } = useApp();
  return (
    <>
      {view === 'landing'     && <Landing />}
      {view === 'auth'        && <AuthPage />}
      {view === 'dashboard'   && <Dashboard />}
      {view === 'parking'     && <ParkingBrowse />}
      {view === 'map'         && <MapView />}
      {view === 'booking'     && <BookingFlow />}
      {view === 'my-bookings' && <MyBookings />}
      {view === 'ev-charging' && <EVCharging />}
      {view === 'profile'     && <Profile />}
      {view === 'energy'      && <EnergyMonitor />}
      {view === 'qr'          && <QRAccess />}
    </>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Theme still applies for this page view when storage is unavailable.
    }
  }, [theme]);

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-label={isLight ? 'Activer le thème sombre' : 'Activer le thème clair'}
      title={isLight ? 'Thème clair — cliquer pour le mode sombre' : 'Thème sombre — cliquer pour le mode clair'}
      className="fixed right-4 top-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-lg transition hover:scale-105 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1db588]"
    >
      {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemeToggle />
      <AppRouter />
    </AppProvider>
  );
}
