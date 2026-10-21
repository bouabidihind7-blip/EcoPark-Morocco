import type { ReactNode } from 'react';
import { ArrowLeft, Home, MapPin, User, Zap, ParkingCircle, Battery, Map } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { View } from '../types';

const NAV_ITEMS: { view: View; icon: typeof Home; label: string }[] = [
  { view: 'dashboard',   icon: Home,    label: 'Accueil'  },
  { view: 'parking',     icon: MapPin,  label: 'Parkings' },
  { view: 'map',         icon: Map,     label: 'Carte'    },
  { view: 'energy',      icon: Battery, label: 'Énergie'  },
  { view: 'ev-charging', icon: Zap,     label: 'Recharge' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { view, navigate, goBack, canGoBack, activeBooking, energy, authError } = useApp();
  const alertActive = energy.bad_weather_alert;

  return (
    <div className="eco-page-background min-h-screen bg-[#1b1b1b] text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[#1b1b1b]/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="Retour à la page précédente"
            title={canGoBack ? 'Retour à la page précédente' : 'Aucune page précédente'}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-gray-500 transition hover:bg-white/10 hover:text-[#1db588] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-medium">Retour</span>
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1db588] to-[#2ec595] flex items-center justify-center">
            <ParkingCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold font-['Poppins'] text-sm">
            EcoPark<span className="text-[#1db588]">Maroc</span>
          </span>

          {activeBooking && (
            <div
              className="ml-auto flex items-center gap-1.5 bg-[#1db588]/10 border border-[#1db588]/30 px-3 py-1 rounded-full cursor-pointer"
              onClick={() => navigate('my-bookings')}
            >
              <div className="w-1.5 h-1.5 bg-[#1db588] rounded-full animate-pulse" />
              <span className="text-xs text-[#1db588] font-medium">Réservation active</span>
            </div>
          )}

          {alertActive && !activeBooking && (
            <div
              className="ml-auto flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full cursor-pointer"
              onClick={() => navigate('energy')}
            >
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs text-amber-400 font-medium">Alerte énergie</span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {authError && (
          <div role="alert" className="mx-auto mt-4 max-w-7xl px-4 text-sm text-red-300">
            Impossible de restaurer la session : {authError}
          </div>
        )}
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111]/95 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 flex">
          {NAV_ITEMS.map(({ view: v, icon: Icon, label }) => {
            const active = view === v;
            const isEnergy = v === 'energy';
            const showAlert = isEnergy && alertActive && !active;
            return (
              <button
                key={v}
                onClick={() => navigate(v)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all relative ${
                  active ? 'text-[#1db588]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-medium">{label}</span>
                {active && <div className="w-4 h-0.5 bg-[#1db588] rounded-full -mt-0.5" />}
                {showAlert && (
                  <span className="absolute top-2 right-[calc(50%-8px)] w-2 h-2 rounded-full bg-amber-400 border-2 border-[#111]" />
                )}
              </button>
            );
          })}
          {/* Profile */}
          <button
            onClick={() => navigate('profile')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
              view === 'profile' ? 'text-[#1db588]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <User className={`w-5 h-5 ${view === 'profile' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-medium">Profil</span>
            {view === 'profile' && <div className="w-4 h-0.5 bg-[#1db588] rounded-full -mt-0.5" />}
          </button>
        </div>
      </nav>
    </div>
  );
}
