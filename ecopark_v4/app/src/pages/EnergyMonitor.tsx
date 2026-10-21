import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import AppLayout from './AppLayout';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ReferenceLine,
} from 'recharts';
import { Sun, Cloud, CloudRain, Wind, Moon, AlertTriangle, Cpu, RefreshCw, Zap } from 'lucide-react';

// ── Weather display config ─────────────────────────────────────────────────
const WEATHER_CONFIG = {
  sunny:         { label: 'Ensoleillé',            icon: Sun,       color: '#f59e0b' },
  partly_cloudy: { label: 'Partiellement nuageux', icon: Cloud,     color: '#94a3b8' },
  rainy:         { label: 'Pluvieux',              icon: CloudRain, color: '#60a5fa' },
  foggy:         { label: 'Brume matinale',        icon: Wind,      color: '#9ca3af' },
  night:         { label: 'Nuit — Agadir',         icon: Moon,      color: '#818cf8' },
};

// ── Live Agadir clock ─────────────────────────────────────────────────────
function AgadirClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hh  = String(now.getHours()).padStart(2, '0');
      const mm  = String(now.getMinutes()).padStart(2, '0');
      const ss  = String(now.getSeconds()).padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="font-mono text-xs text-[#1db588]">{time}</span>
  );
}

// ── Battery SVG gauge ─────────────────────────────────────────────────────
function BatteryGauge({ level, capacity }: { level: number; capacity: number }) {
  const r      = 68;
  const cx     = 88;
  const cy     = 88;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (level / 100) * circ;
  const color  = level > 50 ? '#1db588' : level > 20 ? '#f59e0b' : '#ef4444';
  const kwhNow = Math.round(level / 100 * capacity);

  const bw = 28, bh = 16;
  const bx = cx - bw / 2;
  const by = cy - 34;

  return (
    <svg width="176" height="176" viewBox="0 0 176 176" className="mx-auto block">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={12} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={12}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 1s ease' }}
      />
      {/* Battery body */}
      <rect x={bx} y={by} width={bw} height={bh} rx={3} fill="none" stroke={color} strokeWidth={1.8} />
      <rect x={bx + bw} y={by + bh / 2 - 3} width={3} height={6} rx={1.5} fill={color} />
      <rect
        x={bx + 2.5} y={by + 2.5}
        width={Math.max(0, (bw - 5) * level / 100)} height={bh - 5}
        rx={1.5} fill={color}
        style={{ transition: 'width 1.2s ease' }}
      />
      <text x={cx} y={cy + 8} textAnchor="middle" fill={color} fontSize={28} fontWeight={700} fontFamily="system-ui">
        {Math.round(level)}%
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="#555" fontSize={11} fontFamily="system-ui">
        {kwhNow} kWh / {capacity} kWh
      </text>
    </svg>
  );
}

// ── Coverage ring ─────────────────────────────────────────────────────────
function CoverageRing({ pct }: { pct: number }) {
  const r    = 32;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  const col  = pct >= 80 ? '#1db588' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" className="shrink-0">
      <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
      <circle
        cx={40} cy={40} r={r} fill="none"
        stroke={col} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 1s ease, stroke 1s' }}
      />
      <text x={40} y={44} textAnchor="middle" fill={col} fontSize={14} fontWeight={700} fontFamily="system-ui">
        {pct}%
      </text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function EnergyMonitor() {
  const { energy } = useApp();
  const {
    current_battery_level, solar_generation_rate, ev_consumption_rate,
    weather_status, temperature, cloud_cover, irradiance, is_day,
    last_weather_fetch, weather_fetch_ok,
    solar_forecast, ai_prediction_text, daily_solar_kwh, solar_coverage_pct,
    bad_weather_alert, active_evs, battery_history, firebase_log,
    battery_capacity,
  } = energy;

  const wc      = WEATHER_CONFIG[weather_status] ?? WEATHER_CONFIG.sunny;
  const WIcon   = wc.icon;
  const netRate = parseFloat((solar_generation_rate - ev_consumption_rate).toFixed(1));
  const isNight = weather_status === 'night';

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-['Poppins']">⚡ Moniteur Énergie</h1>
            <p className="text-gray-400 text-sm mt-0.5">Marina Agadir EcoPark · 625 m² · 500 kWh</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1db588] animate-pulse" />
              <span className="text-xs text-gray-500">Agadir ·&nbsp;</span>
              <AgadirClock />
            </div>
          </div>
          <div
            className="flex items-center gap-2 border rounded-xl px-3 py-2 shrink-0"
            style={{ background: `${wc.color}15`, borderColor: `${wc.color}40` }}
          >
            <WIcon className="w-4 h-4" style={{ color: wc.color }} />
            <span className="text-sm font-medium" style={{ color: wc.color }}>{wc.label}</span>
          </div>
        </div>

        {/* ── Real-data badge ── */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
          weather_fetch_ok
            ? 'bg-[#1db588]/8 border-[#1db588]/25 text-[#1db588]'
            : 'bg-amber-500/8 border-amber-500/25 text-amber-400'
        }`}>
          <RefreshCw className="w-3 h-3 shrink-0" />
          {weather_fetch_ok
            ? `Données réelles — Open-Meteo API · Dernière sync : ${last_weather_fetch || '…'} · ${temperature}°C · Nuages ${cloud_cover}% · ${irradiance} W/m²`
            : `Modèle local de secours (API indisponible) · ${irradiance} W/m² estimé`
          }
        </div>

        {/* ── Night banner ── */}
        {isNight && (
          <div className="glass-card rounded-2xl p-6 border border-indigo-400/30 bg-indigo-500/8 flex items-start gap-4">
            <Moon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-indigo-400 text-sm">Mode nuit — panneaux inactifs</div>
              <p className="text-xs text-indigo-300/70 mt-1">
                Production solaire : 0 kW. La batterie (500 kWh) alimente les bornes EV et l'éclairage LED du parking.
                Reprise de la production vers 06h30.
              </p>
            </div>
          </div>
        )}

        {/* ── Alert ── */}
        {bad_weather_alert && (
          <div className="glass-card rounded-2xl p-6 border border-amber-500/40 bg-amber-500/10 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-400 text-sm">Alerte prédictive activée</div>
              <p className="text-xs text-amber-300/80 mt-1">{ai_prediction_text}</p>
            </div>
          </div>
        )}

        {/* ── Parking specs ── */}
        <div className="glass-card rounded-2xl p-6 border border-[#1db588]/20 bg-[#1db588]/5">
          <div className="text-xs font-semibold text-[#1db588] mb-3">★ Parking pilote — Marina Agadir</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[['4','étages'],['200','places'],['40','bornes EV'],['500 kWh','batterie']].map(([v,l]) => (
              <div key={l}>
                <div className="text-lg font-bold">{v}</div>
                <div className="text-xs text-gray-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Battery gauge ── */}
        <div className="glass-card rounded-2xl p-7 text-center">
          <BatteryGauge level={current_battery_level} capacity={battery_capacity} />
          <p className="text-xs text-gray-600 mt-2">5 racks × 100 kWh · lithium-fer-phosphate (LFP)</p>
        </div>

        {/* ── 4 stats ── */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Génération solaire', val: `${solar_generation_rate} kW`, color: isNight ? '#818cf8' : '#f59e0b', icon: isNight ? '🌙' : '☀️' },
            { label: 'Consommation VE',    val: `${ev_consumption_rate} kW`,   color: '#60a5fa',                        icon: '⚡' },
            { label: 'Bilan net',          val: `${netRate >= 0 ? '+' : ''}${netRate} kW`, color: netRate >= 0 ? '#1db588' : '#ef4444', icon: netRate >= 0 ? '📈' : '📉' },
            { label: 'Irradiance réelle',  val: `${irradiance} W/m²`,         color: '#a78bfa',                        icon: '🛰️' },
          ].map(({ label, val, color, icon }) => (
            <div key={label} className="glass-card rounded-2xl p-4 sm:p-6">
              <div className="text-xl mb-2">{icon}</div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color }}>{val}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Solar coverage (the 80% claim) ── */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold text-base text-gray-300 mb-4">
            ☀️ Couverture solaire des besoins EV
          </h2>
          <div className="flex items-center gap-4">
            <CoverageRing pct={is_day ? solar_coverage_pct : 0} />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Production solaire actuelle</span>
                <span className="font-bold" style={{ color: isNight ? '#818cf8' : '#f59e0b' }}>{solar_generation_rate} kW</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Consommation VE actuelle</span>
                <span className="font-bold text-blue-400">{ev_consumption_rate} kW</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, is_day ? solar_coverage_pct : 0)}%`,
                    background: solar_coverage_pct >= 80 ? '#1db588' : solar_coverage_pct >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Énergie solaire générée aujourd'hui</span>
                <span className="font-bold text-[#1db588]">{daily_solar_kwh} kWh</span>
              </div>
            </div>
          </div>
          {is_day && solar_coverage_pct >= 80 && (
            <div className="mt-3 text-xs text-[#1db588] bg-[#1db588]/10 rounded-lg px-3 py-2">
              ✅ Les panneaux solaires couvrent actuellement <strong>{solar_coverage_pct}%</strong> des besoins de recharge — objectif 80% atteint.
            </div>
          )}
          {!is_day && (
            <div className="mt-3 text-xs text-indigo-300/70 bg-indigo-500/8 rounded-lg px-3 py-2">
              🌙 Nuit : la batterie (500 kWh) prend le relais. Couverture solaire reprend à l'aube.
            </div>
          )}
        </div>

        {/* ── AI 6-hour forecast ── */}
        {solar_forecast.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
                <span className="text-[10px]">🤖</span>
              </div>
              <h2 className="font-semibold text-sm text-gray-300">Prédiction IA — 6 heures</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Basée sur les données irradiance horaires Open-Meteo + consommation VE actuelle
            </p>

            {/* AI text output */}
            <div className={`text-xs rounded-xl px-3 py-2.5 mb-3 leading-5 ${
              bad_weather_alert
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'bg-[#1db588]/8 text-[#1db588] border border-[#1db588]/20'
            }`}>
              {ai_prediction_text}
            </div>

            {/* Battery projection chart */}
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={solar_forecast} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="battGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1db588" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1db588" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 9 }} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [
                      name === 'battery_projected' ? `${v}%` : `${v} kW`,
                      name === 'battery_projected' ? 'Batterie prévue' : 'Solaire prévu',
                    ]}
                  />
                  <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area
                    type="monotone" dataKey="battery_projected"
                    stroke="#1db588" strokeWidth={2}
                    fill="url(#battGrad)" dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-1">
              La ligne rouge en tirets = seuil d'alerte 20 %
            </p>
          </div>
        )}

        {/* ── Solar vs EV bar chart ── */}
        {!isNight && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-semibold text-base text-gray-300 mb-4">⚡ Production solaire vs Consommation VE — temps réel</h2>
            <div style={{ height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Solaire ☀️',   value: solar_generation_rate, fill: '#f59e0b' },
                    { name: 'VE ⚡',         value: ev_consumption_rate,   fill: '#60a5fa' },
                  ]}
                  margin={{ top: 0, right: 8, left: -24, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 10 }} tickLine={false} unit=" kW" />
                  <Tooltip
                    contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`${v} kW`]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {[{ fill: '#f59e0b' }, { fill: '#60a5fa' }].map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Battery history (solar + EV overlay) ── */}
        {battery_history.length > 2 && (
          <div className="glass-card rounded-2xl p-4">
            <h2 className="font-semibold text-sm text-gray-300 mb-3">📊 Historique batterie — 1 min glissante</h2>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={battery_history} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                  <XAxis dataKey="t" tick={{ fill: '#555', fontSize: 8 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 9 }} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [
                      `${v}${name === 'v' ? '%' : ' kW'}`,
                      name === 'v' ? 'Batterie' : name === 'solar' ? 'Solaire' : 'VE',
                    ]}
                  />
                  <Line type="monotone" dataKey="v"     stroke="#1db588" strokeWidth={2.5} dot={false} name="v" />
                  <Line type="monotone" dataKey="solar" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="solar" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="ev"    stroke="#60a5fa" strokeWidth={1.5} dot={false} name="ev"    strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-5 mt-2">
              {[['#1db588','Batterie %'],['#f59e0b','Solaire kW'],['#60a5fa','VE kW']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded" style={{ background: c }} />
                  <span className="text-[10px] text-gray-500">{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active EVs ── */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              VEs en charge ({active_evs.length} / 40 bornes)
            </h2>
            <span className="text-xs text-gray-600 font-mono">{ev_consumption_rate} kW</span>
          </div>
          {active_evs.length === 0 ? (
            <div className="text-center py-5 text-gray-600 text-sm">
              {isNight ? 'Mode nuit — aucun VE en charge actuellement' : 'Aucun VE branché — batterie en charge solaire pure'}
            </div>
          ) : (
            <div className="space-y-2">
              {active_evs.map(ev => (
                <div key={ev.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <div>
                    <div className="font-mono text-sm font-semibold">{ev.plate}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{ev.chargerLabel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-400 font-bold text-sm">{ev.kw} kW</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Firebase live log ── */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-[#1db588]" />
            <h2 className="font-semibold text-sm text-gray-300">Firebase Realtime Database — Live</h2>
            <div className="w-2 h-2 rounded-full bg-[#1db588] animate-pulse ml-auto" />
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {firebase_log.length === 0 && (
              <div className="text-xs text-gray-700 font-mono">En attente des premières données…</div>
            )}
            {firebase_log.map((snap, i) => (
              <div
                key={i}
                className="rounded-lg p-2.5 font-mono text-[11px] leading-5"
                style={{ background: 'rgba(29,181,136,0.05)', borderLeft: `3px solid ${snap.bad_weather_alert ? '#ef4444' : '#1db588'}` }}
              >
                <span className="text-gray-600">[{snap.timestamp}] </span>
                <span className="text-[#1db588]">battery</span><span className="text-gray-500">: {snap.current_battery_level}%  </span>
                <span className="text-[#1db588]">solar</span><span className="text-gray-500">: {snap.solar_generation_rate} kW  </span>
                <span className="text-[#1db588]">weather</span><span className="text-gray-500">: "{snap.weather_status}"  </span>
                <span className={snap.bad_weather_alert ? 'text-red-400' : 'text-[#1db588]'}>alert</span>
                <span className="text-gray-500">: {String(snap.bad_weather_alert)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
