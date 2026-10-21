import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { citiesData } from '../data';
import { useApp } from '../context/AppContext';
import AppLayout from './AppLayout';
import type { ParkingLot } from '../types';


// ─── Fix default Leaflet icon broken in Vite ──────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Custom colored pin icon ──────────────────────────────────────────────
function makePin(color: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px; height:36px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid rgba(255,255,255,0.4);
        box-shadow:0 4px 14px rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg); font-size:14px;">🅿</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

const GREEN_PIN  = makePin('#1db588');
const YELLOW_PIN = makePin('#f59e0b');
const RED_PIN    = makePin('#ef4444');

function getPin(available: number, capacity: number) {
  const pct = available / capacity;
  if (pct > 0.5) return GREEN_PIN;
  if (pct > 0.2) return YELLOW_PIN;
  return RED_PIN;
}

// ─── Fly-to helper when city changes ─────────────────────────────────────
const CITY_CENTERS: Record<string, [number, number]> = {
  all:        [31.8, -7.0],
  casablanca: [33.589, -7.625],
  marrakech:  [31.630, -7.998],
  rabat:      [34.015, -6.848],
  tangier:    [35.775, -5.808],
  agadir:     [30.415, -9.590],
};

function FlyTo({ cityId }: { cityId: string }) {
  const map = useMap();
  useEffect(() => {
    const center = CITY_CENTERS[cityId] ?? CITY_CENTERS['all'];
    const zoom = cityId === 'all' ? 6 : 13;
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [cityId, map]);
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────
export default function MapView() {
  const { parkingLots, parkingLoading, parkingError, startBookingFor } = useApp();
  const [selectedCity, setSelectedCity] = useState('all');
  const visibleLots = selectedCity === 'all'
    ? parkingLots
    : parkingLots.filter(l => l.cityId === selectedCity);

  const cityForLot = (lot: ParkingLot) =>
    citiesData.find(c => c.id === lot.cityId)?.name ?? lot.cityId;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-112px)]">

        {/* City filter bar */}
        <div className="px-4 pt-4 pb-3 flex gap-2 overflow-x-auto shrink-0">
          {[{ id: 'all', name: 'Tout le Maroc' }, ...citiesData.filter(city => parkingLots.some(lot => lot.cityId === city.id))].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCity(c.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedCity === c.id
                  ? 'bg-[#1db588] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="px-4 pb-3 flex gap-3 shrink-0">
          {[
            { label: 'Parkings', val: visibleLots.length, icon: '🅿️' },
            { label: 'Places dispo', val: visibleLots.reduce((s, l) => s + l.available, 0), icon: '🟢' },
            { label: 'Bornes EV', val: visibleLots.reduce((s, l) => s + l.evAvailable, 0), icon: '⚡' },
          ].map(({ label, val, icon }) => (
            <div key={label} className="flex-1 glass-card rounded-xl p-2.5 sm:p-4 text-center">
              <div className="text-sm sm:text-base">{icon}</div>
              <div className="text-lg sm:text-xl font-bold text-[#1db588]">{val}</div>
              <div className="text-[10px] sm:text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
        {(parkingLoading || parkingError) && (
          <div className="px-4 pb-2 text-sm">
            {parkingLoading && <p className="text-gray-400">Chargement des parkings…</p>}
            {parkingError && <p role="alert" className="text-red-300">Erreur de chargement : {parkingError}</p>}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 px-4 pb-3 min-h-0">
          <div className="h-full rounded-2xl overflow-hidden border border-white/10">
            <MapContainer
              center={[31.8, -7.0]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <FlyTo cityId={selectedCity} />

              {visibleLots.map(lot => {
                const liveAv = lot.available;
                const pct = liveAv / lot.capacity;
                const color = pct > 0.5 ? '#1db588' : pct > 0.2 ? '#f59e0b' : '#ef4444';
                const cityName = cityForLot(lot);
                return (
                  <Marker
                    key={lot.id}
                    position={[lot.lat, lot.lng]}
                    icon={getPin(liveAv, lot.capacity)}
                    eventHandlers={{}}
                  >
                    <Popup>
                      <div style={{ minWidth: 200, padding: '4px 0' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#f0f0f0' }}>
                          {lot.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
                          📍 {lot.address}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                          {[
                            ['🟩', `${liveAv}`, 'places dispo'],
                            ['⭐', `${lot.rating}`, 'note'],
                            ['⚡', `${lot.evAvailable}`, 'bornes EV'],
                            ['💳', `${lot.price} MAD`, '/heure'],
                          ].map(([ico, val, lbl]) => (
                            <div key={lbl} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                              <div style={{ fontSize: 12 }}>{ico}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div>
                              <div style={{ fontSize: 10, color: '#666' }}>{lbl}</div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => startBookingFor(lot, lot.cityId, cityName)}
                          style={{
                            width: '100%', padding: '8px', borderRadius: 8,
                            background: '#1db588', color: '#fff', border: 'none',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            marginBottom: 6,
                          }}
                        >
                          Réserver ce parking →
                        </button>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${lot.lat},${lot.lng}&destination_place_id=&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            width: '100%', padding: '8px', borderRadius: 8,
                            background: 'rgba(66,133,244,0.15)', color: '#60a5fa',
                            border: '1px solid rgba(66,133,244,0.3)',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            textDecoration: 'none', boxSizing: 'border-box',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                          Itinéraire Google Maps
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-3 flex items-center gap-4 shrink-0">
          <span className="text-xs text-gray-600">Disponibilité :</span>
          {[['#1db588', '> 50%'], ['#f59e0b', '20–50%'], ['#ef4444', '< 20%']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
          <span className="ml-auto text-xs text-gray-600">Clique sur un 🅿 pour réserver</span>
        </div>

      </div>
    </AppLayout>
  );
}
