import { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Star, Zap, SlidersHorizontal, Car } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { citiesData } from '../data';
import AppLayout from './AppLayout';

type SortBy = 'available' | 'price' | 'rating';

interface ApiParkingSpot {
  parking_id: number;
  spot_id: string;
  status: string;
}

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

export default function ParkingBrowse() {
  const {
    startBookingFor,
    parkingLots,
    parkingLoading: loading,
    parkingError: loadError,
  } = useApp();
  const [query, setQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('all');
  const [sortBy, setSortBy] = useState<SortBy>('available');
  const [onlyEV, setOnlyEV] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cameraSpots, setCameraSpots] = useState<ApiParkingSpot[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCameraSpots() {
      try {
        const response = await fetch(`${API_BASE_URL}/parkings/16/spots`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Erreur API (${response.status})`);
        const data: ApiParkingSpot[] = await response.json();
        setCameraSpots(data);
        setCameraError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCameraError(error instanceof Error ? error.message : 'Impossible de charger les états caméra.');
      }
    }

    void loadCameraSpots();
    const intervalId = window.setInterval(() => void loadCameraSpots(), 2000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  const allLots = parkingLots;

  const filtered = useMemo(() => {
    let lots = allLots;
    if (selectedCityId !== 'all') lots = lots.filter(l => l.cityId === selectedCityId);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (normalizedQuery) lots = lots.filter(l =>
      l.name.toLocaleLowerCase().includes(normalizedQuery) ||
      (citiesData.find(c => c.id === l.cityId)?.name ?? l.cityId).toLocaleLowerCase().includes(normalizedQuery) ||
      l.address.toLocaleLowerCase().includes(normalizedQuery)
    );
    if (onlyEV) lots = lots.filter(l => l.evAvailable > 0);
    lots = [...lots].sort((a, b) => {
      if (sortBy === 'available') return b.available - a.available;
      if (sortBy === 'price') return a.price - b.price;
      return b.rating - a.rating;
    });
    return lots;
  }, [allLots, selectedCityId, query, onlyEV, sortBy]);

  const getAvailColor = (av: number, cap: number) => {
    const p = av / cap;
    if (p > 0.5) return 'text-[#1db588]';
    if (p > 0.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getOccBar = (av: number, cap: number) => {
    const p = av / cap;
    if (p > 0.5) return 'bg-[#1db588]';
    if (p > 0.2) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-['Poppins']">Parkings</h1>
          <span className="text-sm text-gray-500">{filtered.length} résultats</span>
        </div>
        {loading && <p className="text-sm text-gray-400">Chargement des parkings depuis la base...</p>}
        {loadError && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
            Impossible de charger les parkings : {loadError}
          </p>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Rechercher un parking ou une adresse..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-600 transition-all focus:border-[#1db588]/40 focus:outline-none"
          />
        </div>

        {/* City chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCityId('all')}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCityId === 'all' ? 'bg-[#1db588] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Toutes
          </button>
          {citiesData.filter(city => parkingLots.some(lot => lot.cityId === city.id)).map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCityId(c.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCityId === c.id ? 'bg-[#1db588] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              showFilters ? 'bg-[#1db588]/20 text-[#1db588] border border-[#1db588]/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtres
          </button>
          <button
            onClick={() => setOnlyEV(!onlyEV)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              onlyEV ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Bornes VE
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-gray-600">Trier :</span>
            {(['available', 'price', 'rating'] as SortBy[]).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === s ? 'bg-[#1db588] text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                {s === 'available' ? 'Dispo' : s === 'price' ? 'Prix' : 'Note'}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? null : loadError ? null : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Car className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun parking trouvé</p>
            <button onClick={() => { setQuery(''); setSelectedCityId('all'); setOnlyEV(false); }}
              className="mt-3 text-[#1db588] text-sm hover:underline">Réinitialiser les filtres</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(lot => {
              const liveAv = lot.available;
              const city = citiesData.find(c => c.id === lot.cityId);
              const cityName = city?.name ?? lot.cityId;
              return (
                <div
                  key={lot.id}
                  className="glass-card rounded-2xl p-6 border border-white/5 hover:border-[#1db588]/20 transition-all cursor-pointer group"
                  onClick={() => startBookingFor(lot, lot.cityId, cityName)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-base truncate group-hover:text-[#1db588] transition-colors">{lot.name}</h3>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-400">{lot.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lot.address}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{cityName}</span>
                        {lot.evAvailable > 0 && (
                          <span className="text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            {lot.evAvailable} VE
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold ${getAvailColor(liveAv, lot.capacity)}`}>{liveAv}</div>
                      <div className="text-xs text-gray-500">/{lot.capacity}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-medium">{lot.price} MAD/h</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getOccBar(liveAv, lot.capacity)}`}
                        style={{ width: `${(liveAv / lot.capacity) * 100}%` }}
                      />
                    </div>
                  </div>

                  {lot.id === 16 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                      <span className="text-xs text-gray-500">Places caméra (démo) :</span>
                      {cameraError ? (
                        <span role="alert" className="text-xs text-red-300">{cameraError}</span>
                      ) : cameraSpots.length === 0 ? (
                        <span className="text-xs text-gray-500">Aucune place reçue</span>
                      ) : cameraSpots.map(spot => (
                        <span
                          key={spot.spot_id}
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            spot.status === 'free'
                              ? 'bg-[#1db588]/10 text-[#1db588]'
                              : 'bg-red-400/10 text-red-300'
                          }`}
                        >
                          {spot.spot_id} : {spot.status === 'free' ? 'libre' : spot.status}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-gray-500">
                      {Math.round((1 - liveAv / lot.capacity) * 100)}% occupé
                    </span>
                    <span className="text-xs font-semibold bg-[#1db588]/10 text-[#1db588] px-3 py-1 rounded-full group-hover:bg-[#1db588] group-hover:text-white transition-all">
                      Réserver →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
