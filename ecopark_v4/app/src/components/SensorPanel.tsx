import { useEffect, useState } from 'react';
import { Camera, LogIn, LogOut, AlertCircle, CheckCircle2, Clock, Car, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { citiesData } from '../data';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SensorPanel() {
  const {
    sensorOccupied, sensorLog, sensorEnter, sensorExit,
    parkingLots, parkingLoading, parkingError,
  } = useApp();
  const [selectedLotId, setSelectedLotId] = useState<number>(1);
  const [plate, setPlate] = useState('');
  const [lastResult, setLastResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showOccupied, setShowOccupied] = useState(false);

  const allLots = parkingLots.map(lot => ({
    ...lot,
    cityName: citiesData.find(city => city.id === lot.cityId)?.name ?? lot.cityId,
  }));
  const selectedLot = allLots.find(lot => lot.id === selectedLotId);
  const lotPlates = sensorOccupied[selectedLotId] ?? [];
  const liveAvail = selectedLot?.available ?? 0;

  useEffect(() => {
    if (allLots.length > 0 && !allLots.some(lot => lot.id === selectedLotId)) {
      setSelectedLotId(allLots[0].id);
    }
  }, [allLots, selectedLotId]);

  if (!selectedLot) {
    return (
      <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm">
        {parkingLoading && <p className="text-gray-400">Chargement des parkings pour la simulation…</p>}
        {parkingError && <p role="alert" className="text-red-300">Erreur de chargement : {parkingError}</p>}
        {!parkingLoading && !parkingError && <p className="text-gray-400">Aucun parking disponible pour la simulation.</p>}
      </div>
    );
  }

  const handleEnter = () => {
    if (!plate.trim()) return;
    const result = sensorEnter(selectedLotId, selectedLot.name, plate);
    if (result === 'ok') setLastResult({ msg: `✅ ${plate.trim().toUpperCase()} — entrée enregistrée. Place marquée occupée.`, ok: true });
    else if (result === 'already_inside') setLastResult({ msg: `⚠️ ${plate.trim().toUpperCase()} est déjà enregistrée dans ce parking.`, ok: false });
    else setLastResult({ msg: `🚫 Parking complet — aucune place disponible.`, ok: false });
    setPlate('');
  };

  const handleExit = () => {
    if (!plate.trim()) return;
    const result = sensorExit(selectedLotId, selectedLot.name, plate);
    if (result === 'ok') setLastResult({ msg: `✅ ${plate.trim().toUpperCase()} — sortie enregistrée. Place libérée.`, ok: true });
    else setLastResult({ msg: `⚠️ ${plate.trim().toUpperCase()} non trouvée dans ce parking.`, ok: false });
    setPlate('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEnter();
  };

  const totalSensorCars = Object.values(sensorOccupied).reduce((sum, plates) => sum + plates.length, 0);

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Camera className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Simulation locale d’entrées/sorties</h3>
          <p className="text-xs text-gray-500">Événements fictifs, non enregistrés dans PostgreSQL</p>
        </div>
        {totalSensorCars > 0 && (
          <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            {totalSensorCars} véhicule{totalSensorCars > 1 ? 's' : ''} suivi{totalSensorCars > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Lot selector */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Parking ciblé</label>
          <select
            value={selectedLotId}
            onChange={e => { setSelectedLotId(Number(e.target.value)); setLastResult(null); }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all"
          >
            {allLots.map(l => (
              <option key={l.id} value={l.id} style={{ background: '#1b1b1b' }}>
                {l.name} — {l.cityName} ({l.available} places dispo)
              </option>
            ))}
          </select>
        </div>

        {/* Live availability for selected lot */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
          <Car className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">{selectedLot?.name}</span>
              <span className={`text-xs font-bold ${liveAvail > selectedLot.capacity * 0.2 ? 'text-[#1db588]' : liveAvail > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {liveAvail}/{selectedLot?.capacity}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${liveAvail / selectedLot.capacity > 0.5 ? 'bg-[#1db588]' : liveAvail / selectedLot.capacity > 0.2 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${(liveAvail / selectedLot.capacity) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Plate input */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Plaque d'immatriculation</label>
          <input
            type="text"
            value={plate}
            onChange={e => setPlate(e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="ex: 12345-أ-1 ou W123456"
            maxLength={20}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 transition-all font-mono tracking-wider"
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleEnter}
            disabled={!plate.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1db588]/20 text-[#1db588] border border-[#1db588]/30 text-sm font-medium hover:bg-[#1db588]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <LogIn className="w-4 h-4" />
            Entrée
          </button>
          <button
            onClick={handleExit}
            disabled={!plate.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sortie
          </button>
        </div>

        {/* Result feedback */}
        {lastResult && (
          <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${lastResult.ok ? 'bg-[#1db588]/10 text-[#1db588]' : 'bg-red-500/10 text-red-400'}`}>
            {lastResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
            <span>{lastResult.msg}</span>
          </div>
        )}

        {/* Vehicles currently inside this lot */}
        {lotPlates.length > 0 && (
          <div>
            <button
              onClick={() => setShowOccupied(!showOccupied)}
              className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-white transition-colors"
            >
              <span>{lotPlates.length} véhicule(s) dans ce parking</span>
              {showOccupied ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showOccupied && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lotPlates.map(p => (
                  <span key={p} className="text-xs font-mono bg-white/10 px-2 py-1 rounded-lg text-gray-300">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sensor event log */}
        {sensorLog.length > 0 && (
          <div>
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Journal capteurs ({sensorLog.length})</span>
              </div>
              {showLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showLog && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {sensorLog.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                    {ev.direction === 'enter'
                      ? <LogIn className="w-3 h-3 text-[#1db588] shrink-0" />
                      : <LogOut className="w-3 h-3 text-red-400 shrink-0" />
                    }
                    <span className="font-mono text-gray-300">{ev.plate}</span>
                    <span className="text-gray-600 truncate">{ev.lotName}</span>
                    <span className="ml-auto text-gray-600 shrink-0">{formatTime(ev.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
