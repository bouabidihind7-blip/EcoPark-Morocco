import { useState } from 'react';
import { Zap, MapPin, Star, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { citiesData, EV_DURATION_OPTIONS } from '../data';
import type { ParkingLot } from '../types';
import AppLayout from './AppLayout';

// Prices: max 100 MAD/h for ultra-rapid DC (as requested)
const CHARGER_LEVELS = [
  { kw: 7.4, label: 'Standard AC',    price: 30,  time: '6–8h',      color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30'    },
  { kw: 22,  label: 'Rapide AC',      price: 60,  time: '2–3h',      color: 'text-[#1db588]',   bg: 'bg-[#1db588]/10',   border: 'border-[#1db588]/30'   },
  { kw: 50,  label: 'Ultra-rapide DC',price: 100, time: '30–45 min', color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30'  },
];

export default function EVCharging() {
  const {
    startBookingFor, navigate, parkingLots, parkingLoading, parkingError,
  } = useApp();
  const [selectedCityId, setSelectedCityId] = useState('agadir');
  const [selectedLevel,  setSelectedLevel]  = useState(1);
  const [selectedDurIdx, setSelectedDurIdx] = useState(3); // default 1h

  const selectedCity = citiesData.find(c => c.id === selectedCityId)!;
  const lotsWithEV = parkingLots.filter(lot => lot.cityId === selectedCityId && lot.evCharging > 0);
  const activeCities = citiesData.filter(city => parkingLots.some(lot => lot.cityId === city.id));
  const totalChargers = parkingLots.reduce((total, lot) => total + lot.evCharging, 0);
  const totalAvailableChargers = parkingLots.reduce((total, lot) => total + lot.evAvailable, 0);
  const level        = CHARGER_LEVELS[selectedLevel];
  const dur          = EV_DURATION_OPTIONS[selectedDurIdx];

  // Total price rounded to 2 decimals
  const totalPrice = Math.round(level.price * dur.value * 100) / 100;

  const handleBookEV = (lot: ParkingLot) => {
    startBookingFor({ ...lot, price: level.price }, selectedCity.id, selectedCity.name);
    navigate('booking');
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <div>
          <h1 className="text-2xl font-bold font-['Poppins']">Recharge Véhicule Électrique</h1>
          <p className="text-gray-400 text-sm mt-1">Bornes alimentées à 100% par énergie solaire</p>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Bornes totales', value: parkingLoading && parkingLots.length === 0 ? '…' : totalChargers.toLocaleString('fr-MA') },
            { label: 'Bornes disponibles', value: parkingLoading && parkingLots.length === 0 ? '…' : totalAvailableChargers.toLocaleString('fr-MA') },
            { label: 'Prix départ',    value: '30 MAD/h' },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card rounded-2xl p-5 text-center">
              <div className="text-2xl font-bold text-[#1db588]">{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Charger type selector */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Type de chargeur</h2>
          <div className="space-y-2">
            {CHARGER_LEVELS.map((l, i) => (
              <button
                key={i}
                onClick={() => setSelectedLevel(i)}
                className={`w-full glass-card rounded-xl p-5 flex items-center gap-5 border transition-all ${
                  selectedLevel === i ? `${l.border} ${l.bg}` : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${l.bg} border ${l.border} flex items-center justify-center shrink-0`}>
                  <Zap className={`w-5 h-5 ${l.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{l.kw} kW — {l.label}</div>
                  <div className="text-xs text-gray-500">Temps de charge : {l.time}</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${selectedLevel === i ? l.color : 'text-gray-300'}`}>
                    {l.price} <span className="text-sm font-normal">MAD/h</span>
                  </div>
                </div>
                {selectedLevel === i && (
                  <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center shrink-0" style={{ color: l.color.replace('text-', '') }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-current" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Duration selector */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Durée de charge
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {EV_DURATION_OPTIONS.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelectedDurIdx(i)}
                className={`rounded-xl py-3 px-2 text-center border transition-all font-medium text-sm ${
                  selectedDurIdx === i
                    ? 'bg-[#1db588]/10 border-[#1db588]/40 text-[#1db588]'
                    : 'bg-white/3 border-white/8 text-gray-400 hover:border-white/15'
                }`}
              >
                <div className="font-bold">{d.shortLabel}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{d.label}</div>
              </button>
            ))}
          </div>

          {/* Price summary */}
          <div className="mt-3 glass-card rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {level.kw} kW · {dur.label}
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-[#1db588]">{totalPrice} MAD</span>
              <span className="text-xs text-gray-500 ml-1">total</span>
            </div>
          </div>
        </div>

        {/* City selector */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Choisir une ville</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {activeCities.map(city => (
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

        {/* Stations */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Stations — {selectedCity.name}</h2>
          {parkingLoading && parkingLots.length === 0 && <p className="mb-3 text-sm text-gray-400">Chargement des bornes…</p>}
          {parkingError && <p role="alert" className="mb-3 text-sm text-red-300">Erreur de chargement des parkings : {parkingError}</p>}
          <div className="space-y-3">
            {lotsWithEV.map(lot => {
              const liveEV = lot.evAvailable;
              const hasAvail = liveEV > 0;
              const isPilot  = lot.id === 16;
              return (
                <div
                  key={lot.id}
                  className={`glass-card rounded-2xl p-6 border transition-all ${
                    isPilot ? 'border-[#1db588]/30 bg-[#1db588]/5' :
                    hasAvail ? 'border-white/5 hover:border-[#1db588]/20 cursor-pointer' : 'border-white/5 opacity-60'
                  }`}
                  onClick={hasAvail ? () => handleBookEV(lot) : undefined}
                >
                  {isPilot && (
                    <div className="text-[10px] font-bold text-[#1db588] mb-2 flex items-center gap-1">
                      ★ Parking pilote EcoPark — Marina Agadir
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-base truncate">{lot.name}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-400">{lot.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <MapPin className="w-3 h-3" /> {lot.address}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`font-semibold ${hasAvail ? 'text-[#1db588]' : 'text-red-400'}`}>
                          {hasAvail ? `${liveEV} borne${liveEV > 1 ? 's' : ''} dispo` : 'Complet'}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-500">{lot.evCharging} bornes total</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold">{totalPrice} MAD</div>
                      <div className="text-xs text-gray-500">{dur.label}</div>
                      {hasAvail && (
                        <span className="text-xs bg-[#1db588]/10 text-[#1db588] px-2 py-0.5 rounded-full mt-1 inline-block">
                          Réserver
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!parkingLoading && !parkingError && lotsWithEV.length === 0 && (
              <p className="text-sm text-gray-500">Aucune borne de recharge renseignée pour cette ville.</p>
            )}
          </div>
        </div>

        {/* Solar info */}
        <div className="glass-card rounded-2xl p-4 bg-[#1db588]/5 border border-[#1db588]/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1db588]/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-[#1db588]" />
            </div>
            <div>
              <div className="font-medium text-sm mb-1">Projet de recharge solaire — Marina Agadir</div>
              <p className="text-xs text-gray-400">
                Le projet prévoit 625 m² de panneaux solaires et une batterie de 500 kWh à Marina Agadir.
                La part solaire réelle de l’énergie distribuée n’est pas encore mesurée par l’application.
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
