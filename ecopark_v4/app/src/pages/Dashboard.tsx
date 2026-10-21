import { useState, useEffect } from 'react';
import { MapPin, Car, Zap, Leaf, Clock, Wallet, ChevronRight, Star, TrendingUp, Bell, Battery, AlertTriangle, Map } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { citiesData } from '../data';
import AppLayout from './AppLayout';
import SensorPanel from '../components/SensorPanel';

function TimeUntilEnd({ endTime }: { endTime: string }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expiré'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return <span>{remaining}</span>;
}

export default function Dashboard() {
  const {
    user, activeBooking, navigate, parkingLots, parkingLoading, parkingError,
    startBookingFor, energy,
  } = useApp();
  const [selectedCityId, setSelectedCityId] = useState('casablanca');

  const selectedCity = citiesData.find(c => c.id === selectedCityId)!;
  const cityLots = parkingLots.filter(lot => lot.cityId === selectedCityId);
  const totalAvailable = cityLots.reduce((sum, lot) => sum + lot.available, 0);

  const getOccupancyColor = (available: number, capacity: number) => {
    const pct = available / capacity;
    if (pct > 0.5) return 'text-[#1db588]';
    if (pct > 0.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getOccupancyBg = (available: number, capacity: number) => {
    const pct = available / capacity;
    if (pct > 0.5) return 'bg-[#1db588]';
    if (pct > 0.2) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Bonjour,</p>
            <h1 className="text-2xl font-bold font-['Poppins']">{user?.name?.split(' ')[0]} 👋</h1>
          </div>
          <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-gray-300" />
            {energy.bad_weather_alert && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </button>
        </div>

        {/* ⚠️ Bad weather energy alert — linked to energy simulation */}
        {energy.bad_weather_alert && (
          <div
            className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/8 cursor-pointer hover:border-amber-500/50 transition-all"
            onClick={() => navigate('energy')}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-400">Alerte météo solaire active</div>
                <div className="text-xs text-amber-300/70 mt-0.5">
                  Batterie {Math.round(energy.current_battery_level)}% · Solaire {energy.solar_generation_rate} kW ·{' '}
                  Consommation VE {energy.ev_consumption_rate} kW
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6 col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-[#1db588]" />
              <span className="text-sm text-gray-400">Portefeuille</span>
            </div>
            <div className="text-3xl font-bold">{user?.walletBalance?.toFixed(0)}</div>
            <div className="text-xs text-gray-500">MAD</div>
          </div>
          <div className="glass-card rounded-2xl p-6 col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-[#1db588]" />
              <span className="text-sm text-gray-400">CO₂ économisé</span>
            </div>
            <div className="text-3xl font-bold">{user?.co2Saved?.toFixed(1)}</div>
            <div className="text-xs text-gray-500">kg</div>
          </div>
          <div className="glass-card rounded-2xl p-6 col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-5 h-5 text-[#1db588]" />
              <span className="text-sm text-gray-400">Réservations</span>
            </div>
            <div className="text-3xl font-bold">{user?.totalBookings}</div>
            <div className="text-xs text-gray-500">total</div>
          </div>
        </div>

        {/* Energy quick summary card */}
        <div
          className="glass-card rounded-2xl p-4 border border-white/5 hover:border-[#1db588]/20 cursor-pointer transition-all"
          onClick={() => navigate('energy')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-[#1db588]" />
              <span className="text-sm font-semibold">Batterie solaire centrale</span>
            </div>
            <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              Détails <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    energy.current_battery_level > 50 ? 'bg-[#1db588]' :
                    energy.current_battery_level > 20 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${energy.current_battery_level}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>☀️ {energy.solar_generation_rate} kW généré</span>
                <span>⚡ {energy.ev_consumption_rate} kW consommé</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-2xl font-bold ${
                energy.current_battery_level > 50 ? 'text-[#1db588]' :
                energy.current_battery_level > 20 ? 'text-yellow-400' : 'text-red-400'
              }`}>{Math.round(energy.current_battery_level)}%</div>
              <div className="text-xs text-gray-500">batterie</div>
            </div>
          </div>
        </div>

        {/* Active booking */}
        {activeBooking ? (
          <div className="glass-card rounded-2xl p-5 border border-[#1db588]/30 bg-[#1db588]/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#1db588] rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-[#1db588]">Réservation active</span>
              </div>
              <button onClick={() => navigate('my-bookings')} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                Détails <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{activeBooking.parkingLotName}</div>
                <div className="text-sm text-gray-400">{activeBooking.cityName} · Place {activeBooking.spotNumber}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-[#1db588]">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-semibold"><TimeUntilEnd endTime={activeBooking.endTime} /></span>
                </div>
                <div className="text-xs text-gray-500">restant</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-5 border border-dashed border-white/10 text-center">
            <Car className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune réservation active</p>
            <button onClick={() => navigate('parking')} className="mt-3 text-[#1db588] text-sm hover:underline">
              Trouver un parking →
            </button>
          </div>
        )}

        {/* City selector */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg font-['Poppins']">Parkings à proximité</h2>
            <div className="flex items-center gap-1 text-[#1db588] text-sm">
              <div className="w-2 h-2 bg-[#1db588] rounded-full animate-pulse" />
              <span>{parkingLoading && parkingLots.length === 0 ? 'Chargement…' : `${totalAvailable} places dispo`}</span>
            </div>
          </div>
          {parkingError && (
            <p role="alert" className="mb-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
              Erreur de chargement des parkings : {parkingError}
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {citiesData.filter(city => parkingLots.some(lot => lot.cityId === city.id)).map(city => (
              <button
                key={city.id}
                onClick={() => setSelectedCityId(city.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCityId === city.id ? 'bg-[#1db588] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* Parking lot cards */}
        <div className="space-y-3">
          {cityLots.map(lot => {
            const liveAvailable = lot.available;
            const occupancy = liveAvailable / lot.capacity;
            return (
              <div
                key={lot.id}
                className="glass-card rounded-2xl p-4 hover:border-[#1db588]/20 border border-white/5 transition-all cursor-pointer group"
                onClick={() => startBookingFor(lot, selectedCity.id, selectedCity.name)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate group-hover:text-[#1db588] transition-colors">{lot.name}</h3>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-400">{lot.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{lot.address}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${getOccupancyBg(liveAvailable, lot.capacity)}`}
                        style={{ width: `${occupancy * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xl font-bold ${getOccupancyColor(liveAvailable, lot.capacity)}`}>
                      {liveAvailable}
                    </div>
                    <div className="text-xs text-gray-500">places</div>
                    <div className="text-xs text-gray-400 mt-1">{lot.price} MAD/h</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span>{lot.evAvailable} VE dispo</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>{Math.round((1 - occupancy) * 100)}% occupé</span>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-[#1db588]/10 text-[#1db588] px-3 py-1 rounded-full font-medium group-hover:bg-[#1db588] group-hover:text-white transition-all">
                      Réserver
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {!parkingLoading && !parkingError && cityLots.length === 0 && (
            <p className="text-sm text-gray-500">Aucun parking disponible pour cette ville.</p>
          )}
        </div>

        {/* Sensor System */}
        <SensorPanel />

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('my-bookings')}
            className="glass-card rounded-2xl p-4 text-left hover:border-[#1db588]/20 border border-white/5 transition-all"
          >
            <Clock className="w-6 h-6 text-[#1db588] mb-2" />
            <div className="font-medium text-sm">Mes resas</div>
            <div className="text-xs text-gray-500 mt-0.5">Historique</div>
          </button>
          <button
            onClick={() => navigate('map')}
            className="glass-card rounded-2xl p-4 text-left hover:border-blue-400/20 border border-white/5 transition-all"
          >
            <Map className="w-6 h-6 text-blue-400 mb-2" />
            <div className="font-medium text-sm">Carte</div>
            <div className="text-xs text-gray-500 mt-0.5">18 parkings</div>
          </button>
          <button
            onClick={() => navigate('energy')}
            className="glass-card rounded-2xl p-4 text-left hover:border-amber-400/20 border border-white/5 transition-all relative"
          >
            {energy.bad_weather_alert && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            <Battery className="w-6 h-6 text-amber-400 mb-2" />
            <div className="font-medium text-sm">Énergie</div>
            <div className="text-xs text-gray-500 mt-0.5">{Math.round(energy.current_battery_level)}%</div>
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
