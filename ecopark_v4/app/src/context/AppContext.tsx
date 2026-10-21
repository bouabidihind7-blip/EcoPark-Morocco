import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type {
  User, Booking, View, BookingDraft, ParkingLot, SpotType, BookingStatus,
  EnergyState, WeatherStatus, FirebaseSnapshot, SolarForecastPoint,
} from '../types';

export interface SensorEvent {
  id: string;
  lotId: number;
  lotName: string;
  plate: string;
  direction: 'enter' | 'exit';
  timestamp: string;
}

interface AppContextType {
  view: View;
  navigate: (v: View) => void;
  goBack: () => void;
  canGoBack: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (u: Partial<User>) => void;
  updateProfileName: (name: string) => Promise<void>;
  authError: string | null;
  bookings: Booking[];
  activeBooking: Booking | null;
  createBooking: (draft: BookingDraft) => Promise<Booking>;
  cancelBooking: (id: string) => Promise<void>;
  extendBooking: (id: string, extraHours: number) => Promise<boolean>;
  bookingError: string | null;
  parkingLots: ParkingLot[];
  parkingLoading: boolean;
  parkingError: string | null;
  sensorOccupied: Record<number, string[]>;
  sensorLog: SensorEvent[];
  sensorEnter: (lotId: number, lotName: string, plate: string) => 'ok' | 'already_inside' | 'lot_full';
  sensorExit:  (lotId: number, lotName: string, plate: string) => 'ok' | 'not_found';
  bookingDraft: BookingDraft;
  setBookingDraft: (d: Partial<BookingDraft>) => void;
  startBookingFor: (lot: ParkingLot, cityId: string, cityName: string) => void;
  energy: EnergyState;
}

const AppContext = createContext<AppContextType | null>(null);

const LEGACY_USERS_KEY = 'ecopark_users';
const LEGACY_AUTH_KEY = 'ecopark_auth';
const PROFILE_PREFERENCES_KEY = 'ecopark_profile_preferences';
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
const SPOT_TYPES: readonly SpotType[] = ['standard', 'ev', 'handicapped', 'vip'];

function isSpotType(value: string): value is SpotType {
  return SPOT_TYPES.some(spotType => spotType === value);
}

interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface ApiBooking {
  id: string;
  user_id: string;
  parking_id: number;
  parking_name: string;
  city_id: string;
  city_name: string;
  spot_type: string;
  spot_number: string;
  duration: number;
  start_time: string;
  end_time: string;
  price: number;
  status: string;
  payment_method: 'wallet' | 'card';
  co2_saved: number;
  qr_code_token?: string;
  can_cancel: boolean;
}

interface UserPreferences {
  plan: User['plan'];
  walletBalance: number;
  joinedAt: string;
}

function loadProfilePreferences(): Record<string, UserPreferences> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_PREFERENCES_KEY) || '{}');
  } catch (error) {
    console.error('Could not read local profile preferences.', error);
    return {};
  }
}

function saveProfilePreferences(preferences: Record<string, UserPreferences>) {
  localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(preferences));
}

function migrateLegacyProfilePreferences() {
  const legacyUsers = localStorage.getItem(LEGACY_USERS_KEY);
  if (legacyUsers) {
    try {
      const users = JSON.parse(legacyUsers) as Record<string, {
        user?: Partial<User>;
      }>;
      const preferences = loadProfilePreferences();
      for (const [email, record] of Object.entries(users)) {
        const legacyUser = record.user;
        if (!legacyUser) continue;
        preferences[email.toLowerCase()] = {
          plan: legacyUser.plan ?? 'free',
          walletBalance: legacyUser.walletBalance ?? 30,
          joinedAt: legacyUser.joinedAt ?? new Date().toISOString(),
        };
      }
      saveProfilePreferences(preferences);
    } catch (error) {
      console.error('Could not migrate local account preferences.', error);
    } finally {
      localStorage.removeItem(LEGACY_USERS_KEY);
      localStorage.removeItem(LEGACY_AUTH_KEY);
    }
  }
}

function mapApiUser(apiUser: ApiUser): User {
  const preferences = loadProfilePreferences()[apiUser.email.toLowerCase()];
  return {
    id: apiUser.id,
    name: apiUser.full_name,
    email: apiUser.email,
    plan: preferences?.plan ?? 'free',
    walletBalance: preferences?.walletBalance ?? 30,
    co2Saved: 0,
    totalBookings: 0,
    joinedAt: preferences?.joinedAt ?? apiUser.created_at,
  };
}

function mapApiBooking(apiBooking: ApiBooking): Booking {
  if (!isSpotType(apiBooking.spot_type)) {
    throw new Error(`Unknown parking spot type returned by API: ${apiBooking.spot_type}`);
  }
  const statusMap: Record<string, BookingStatus> = {
    active: 'active',
    completed: 'completed',
    cancelled: 'cancelled',
    expired: 'expired',
  };
  const status = statusMap[apiBooking.status];
  if (!status) {
    throw new Error(`Unknown reservation status returned by API: ${apiBooking.status}`);
  }
  return {
    id: apiBooking.id,
    userId: apiBooking.user_id,
    parkingLotId: apiBooking.parking_id,
    parkingLotName: apiBooking.parking_name,
    cityId: apiBooking.city_id,
    cityName: apiBooking.city_name,
    spotType: apiBooking.spot_type,
    spotNumber: apiBooking.spot_number,
    duration: apiBooking.duration,
    startTime: apiBooking.start_time,
    endTime: apiBooking.end_time,
    price: apiBooking.price,
    status,
    paymentMethod: apiBooking.payment_method,
    co2Saved: apiBooking.co2_saved,
    qrCodeToken: apiBooking.qr_code_token,
    canCancel: apiBooking.can_cancel,
  };
}

async function apiErrorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { detail?: unknown } | null;
  return typeof body?.detail === 'string'
    ? body.detail
    : `Request failed (${response.status}).`;
}

interface ApiParking {
  id: number;
  name: string;
  city_id: string;
  capacity: number;
  available: number;
  price: number;
  ev_charging: number;
  ev_available: number;
  lat: number;
  lng: number;
  address: string;
  rating: number;
}

// ── Marina Agadir physical constants ────────────────────────────────────────
// 4th floor roof: 50 spots × 12.5 m² = 625 m² of monocrystalline panels
// Efficiency 20 % (Tier-1 panels)  ·  Performance Ratio 0.85 (temp + wiring + inverter)
// Peak at 1 000 W/m²: 625 × 0.20 × 0.85 = 106.25 kW theoretical → ~78 kW after clipping
const PANEL_AREA       = 625;   // m²
const PANEL_EFFICIENCY = 0.20;
const PERF_RATIO       = 0.85;
const BATTERY_KWH      = 500;   // kWh — 5 × 100 kWh LFP racks
// Clip at 78 kW (inverter limit)
const INVERTER_CLIP_KW = 78;

// Agadir GPS — used by Open-Meteo
const LAT = 30.4278;
const LNG = -9.5981;

// WMO weather code → our WeatherStatus
function wmoToStatus(code: number, isDay: boolean): WeatherStatus {
  if (!isDay) return 'night';
  if (code === 0 || code === 1) return 'sunny';
  if (code <= 3) return 'partly_cloudy';
  if (code >= 45 && code <= 48) return 'foggy';
  return 'rainy';
}

// Irradiance (W/m²) → panel output (kW), clipped at inverter max
function irradianceToKw(wm2: number): number {
  const raw = wm2 * PANEL_AREA * PANEL_EFFICIENCY * PERF_RATIO / 1000;
  return Math.min(parseFloat(raw.toFixed(1)), INVERTER_CLIP_KW);
}

// ── AI prediction engine ─────────────────────────────────────────────────
// Uses Open-Meteo hourly solar forecast + current EV rate to project battery
// for the next 6 hours. Flags if battery will hit < 20 %.
function buildForecast(
  hourlyRadiation: number[],
  hourlyTimes: string[],
  currentHourIdx: number,
  battLevel: number,
  evRate: number,
): { points: SolarForecastPoint[]; text: string; alert: boolean } {
  const points: SolarForecastPoint[] = [];
  let batt = battLevel;
  let alertHour: number | null = null;

  for (let i = 0; i < 6; i++) {
    const idx = currentHourIdx + i;
    if (idx >= hourlyRadiation.length) break;
    const rad  = hourlyRadiation[idx] ?? 0;
    const skw  = irradianceToKw(rad);
    const net  = skw - evRate;
    const dPct = (net / BATTERY_KWH) * 100; // % change over 1 h
    batt = Math.max(0, Math.min(100, batt + dPct));

    const localH = new Date(hourlyTimes[idx]).getHours();
    const label  = `${String(localH).padStart(2, '0')}:00`;

    if (batt < 20 && alertHour === null) alertHour = localH;

    points.push({
      hour: localH,
      label,
      radiation: Math.round(rad),
      solar_kw: skw,
      battery_projected: Math.round(batt),
    });
  }

  const finalBatt = points[points.length - 1]?.battery_projected ?? Math.round(battLevel);
  const trend = finalBatt > battLevel + 5 ? 'en hausse 📈'
               : finalBatt < battLevel - 5 ? 'en baisse 📉'
               : 'stable ↔';

  let text: string;
  if (alertHour !== null) {
    text = `⚠️ Alerte : la batterie passera sous 20 % vers ${String(alertHour).padStart(2, '0')}h. `
         + `Recommandation : limiter les bornes DC 50 kW ou activer le réseau ONEE de secours.`;
  } else if (finalBatt > 80) {
    text = `✅ Excellent. Dans 6h la batterie sera à ${finalBatt} % (${trend}). `
         + `La production solaire d'Agadir couvre largement les besoins de recharge.`;
  } else {
    text = `🔋 Batterie prévue à ${finalBatt} % dans 6h (${trend}). `
         + `Génération solaire suffisante — aucune action requise.`;
  }

  return { points, text, alert: alertHour !== null };
}

// ── Coverage calculation ─────────────────────────────────────────────────
// During daylight (~10 h/day in Agadir), solar peak avg ≈ 55 kW.
// Realistic: 3-5 EVs simultaneously (10–12 % of 40 chargers), avg kW ~20.
// We show the DAYTIME coverage: solar_kw / ev_kw × 100 clipped at 100.
function calcCoveragePct(solarKw: number, evKw: number): number {
  if (evKw < 1) return 100;
  return Math.min(100, Math.round((solarKw / evKw) * 100));
}

// Fallback irradiance when Open-Meteo is unreachable (uses local time of day)
function fallbackIrradiance(): number {
  const localH = new Date().getHours();
  if (localH < 6 || localH >= 20) return 0;
  // Simple bell curve peaking at noon: 800 W/m² peak (Agadir average)
  const norm = Math.sin(((localH - 6) / 14) * Math.PI);
  return Math.round(800 * norm * norm);
}

// ── Initial state (best-guess before first API fetch) ───────────────────
const initRad = fallbackIrradiance();
const INITIAL_ENERGY: EnergyState = {
  battery_capacity:    BATTERY_KWH,
  current_battery_level: 68,
  solar_generation_rate: irradianceToKw(initRad),
  ev_consumption_rate:   0,
  weather_status:        initRad > 0 ? 'sunny' : 'night',
  temperature:           22,
  cloud_cover:           0,
  is_day:                initRad > 0,
  irradiance:            initRad,
  last_weather_fetch:    '',
  weather_fetch_ok:      true,
  solar_forecast:        [],
  ai_prediction_text:    'Chargement de la prédiction IA…',
  daily_solar_kwh:       0,
  solar_coverage_pct:    0,
  bad_weather_alert:     false,
  active_evs:            [],
  battery_history:       [{ t: '00:00', v: 68, solar: irradianceToKw(initRad), ev: 0 }],
  firebase_log:          [],
};

const DEFAULT_DRAFT: BookingDraft = {
  parkingLot: null, cityId: 'agadir', cityName: 'Agadir', spotType: 'standard', duration: 2,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView]               = useState<View>('landing');
  const [viewHistory, setViewHistory] = useState<View[]>([]);
  const [user, setUser]               = useState<User | null>(null);
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [parkingLoading, setParkingLoading] = useState(true);
  const [parkingError, setParkingError] = useState<string | null>(null);
  const [bookingDraft, setDraftState] = useState<BookingDraft>(DEFAULT_DRAFT);
  const [sensorOccupied, setSensorOc] = useState<Record<number, string[]>>({});
  const [sensorLog, setSensorLog]     = useState<SensorEvent[]>([]);
  const [energy, setEnergy]           = useState<EnergyState>(INITIAL_ENERGY);

  // Refs keep real-time values accessible inside setInterval without stale closures
  const battRef   = useRef(INITIAL_ENERGY.current_battery_level);
  const solarRef  = useRef(INITIAL_ENERGY.solar_generation_rate);
  const evRef     = useRef(0);
  const tickRef   = useRef(0);
  // Full hourly radiation array for AI forecast (updated each fetch)
  const hourlyRad = useRef<number[]>([]);
  const hourlyTim = useRef<string[]>([]);
  const viewRef = useRef<View>('landing');
  const viewHistoryRef = useRef<View[]>([]);

  const refreshBookings = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/reservations`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response));
      const data: ApiBooking[] = await response.json();
      const userBookings = data.map(mapApiBooking);
      setBookings(userBookings);
      setUser(prev => prev?.id === userId
        ? {
            ...prev,
            totalBookings: userBookings.length,
            co2Saved: Math.round(
              userBookings.reduce((total, booking) => total + booking.co2Saved, 0) * 10
            ) / 10,
          }
        : prev);
      setBookingError(null);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Impossible de charger les réservations.');
    }
  }, []);

  const navigate = useCallback((nextView: View) => {
    if (viewRef.current === nextView) return;
    const history = [...viewHistoryRef.current, viewRef.current];
    viewHistoryRef.current = history;
    viewRef.current = nextView;
    setViewHistory(history);
    setView(nextView);
  }, []);

  const goBack = useCallback(() => {
    const history = [...viewHistoryRef.current];
    const previousView = history.pop() ?? 'landing';
    viewHistoryRef.current = history;
    viewRef.current = previousView;
    setViewHistory(history);
    setView(previousView);
  }, []);

  // ── Auth restore ────────────────────────────────────────────────────────
  useEffect(() => {
    migrateLegacyProfilePreferences();
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
        });
        if (response.status === 401) return;
        if (!response.ok) throw new Error(await apiErrorMessage(response));
        const payload: { user: ApiUser } = await response.json();
        if (cancelled) return;
        const restoredUser = mapApiUser(payload.user);
        setUser(restoredUser);
        setAuthError(null);
        viewHistoryRef.current = ['landing'];
        setViewHistory(['landing']);
        viewRef.current = 'dashboard';
        setView('dashboard');
        await refreshBookings(restoredUser.id);
      } catch (error) {
        if (cancelled) return;
        setAuthError(error instanceof Error ? error.message : 'Impossible de restaurer la session.');
      }
    }

    void restoreSession();
    return () => { cancelled = true; };
  }, [refreshBookings]);

  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(() => {
      void refreshBookings(user.id);
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [refreshBookings, user?.id]);

  // ── Shared parking catalog from PostgreSQL (refresh every 20 s) ────────
  useEffect(() => {
    const controller = new AbortController();

    async function loadParkings() {
      try {
        const response = await fetch(`${API_BASE_URL}/parkings`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Erreur API (${response.status})`);
        const data: ApiParking[] = await response.json();
        setParkingLots(data.map((parking): ParkingLot => ({
          id: parking.id,
          name: parking.name,
          capacity: parking.capacity,
          available: parking.available,
          price: parking.price,
          evCharging: parking.ev_charging,
          evAvailable: parking.ev_available,
          lat: parking.lat,
          lng: parking.lng,
          cityId: parking.city_id,
          address: parking.address,
          rating: parking.rating,
        })));
        setParkingError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setParkingError(error instanceof Error ? error.message : 'Impossible de charger les parkings.');
      } finally {
        if (!controller.signal.aborted) setParkingLoading(false);
      }
    }

    void loadParkings();
    const intervalId = window.setInterval(() => void loadParkings(), 20000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  // ── Real weather fetch (Open-Meteo) — every 15 minutes ─────────────────
  //    This is where actual Agadir irradiance & weather codes come from.
  //    Meteo doesn't change every second — 15 min is the standard update cycle.
  const fetchWeather = useCallback(async () => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${LAT}&longitude=${LNG}` +
        `&current=temperature_2m,weather_code,cloud_cover,is_day,direct_radiation,diffuse_radiation` +
        `&hourly=shortwave_radiation,direct_radiation` +
        `&daily=shortwave_radiation_sum` +
        `&timezone=Africa%2FCasablanca` +
        `&forecast_days=1`;

      const res  = await fetch(url);
      const data = await res.json();
      const cur  = data.current;

      // Total irradiance = direct + diffuse (realistic panel input)
      const totalIrrad = (cur.direct_radiation ?? 0) + (cur.diffuse_radiation ?? 0);
      const solarKw    = irradianceToKw(totalIrrad);
      const status     = wmoToStatus(cur.weather_code, cur.is_day === 1);

      // Store hourly arrays in refs for AI forecast
      hourlyRad.current = data.hourly.shortwave_radiation as number[];
      hourlyTim.current = data.hourly.time as string[];

      // Daily solar generation: radiation_sum (kWh/m²) × panel specs
      const dailySolarKwh = parseFloat(
        ((data.daily.shortwave_radiation_sum?.[0] ?? 0) * PANEL_AREA * PANEL_EFFICIENCY * PERF_RATIO).toFixed(0)
      );

      // Find current hour index in the hourly array
      const nowHour    = new Date().getHours();
      const hourIdx    = hourlyTim.current.findIndex(t => new Date(t).getHours() === nowHour);
      const safeIdx    = hourIdx >= 0 ? hourIdx : 0;

      // Build 6-hour AI forecast
      const { points, text, alert } = buildForecast(
        hourlyRad.current, hourlyTim.current, safeIdx,
        battRef.current, evRef.current
      );

      // Coverage % during daylight (solar vs EV demand)
      const coveragePct = cur.is_day
        ? calcCoveragePct(solarKw, Math.max(evRef.current, 10))
        : 0;

      // Update solar ref so battery loop uses real value
      solarRef.current = solarKw;

      const fetchTs = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      setEnergy(prev => ({
        ...prev,
        solar_generation_rate: solarKw,
        weather_status:        status,
        temperature:           cur.temperature_2m ?? 22,
        cloud_cover:           cur.cloud_cover ?? 0,
        is_day:                cur.is_day === 1,
        irradiance:            Math.round(totalIrrad),
        last_weather_fetch:    fetchTs,
        weather_fetch_ok:      true,
        solar_forecast:        points,
        ai_prediction_text:    text,
        daily_solar_kwh:       dailySolarKwh,
        solar_coverage_pct:    coveragePct,
        bad_weather_alert:     alert,
      }));
    } catch {
      // API unreachable — fall back to physics-based estimate from local time
      const rad    = fallbackIrradiance();
      const solarKw = irradianceToKw(rad);
      const hour   = new Date().getHours();
      const status: WeatherStatus = rad === 0 ? 'night' : hour > 9 && hour < 17 ? 'sunny' : 'partly_cloudy';
      solarRef.current = solarKw;
      setEnergy(prev => ({
        ...prev,
        solar_generation_rate: solarKw,
        weather_status:        status,
        is_day:                rad > 0,
        irradiance:            rad,
        weather_fetch_ok:      false,
        ai_prediction_text:    '⚠️ API météo indisponible — utilisation du modèle de secours local.',
      }));
    }
  }, []);

  useEffect(() => {
    fetchWeather();                                    // fetch immediately on mount
    const iv = setInterval(fetchWeather, 15 * 60 * 1000); // then every 15 minutes
    return () => clearInterval(iv);
  }, [fetchWeather]);

  // ── EV plug-in / out simulation ────────────────────────────────────────
  // Marina Agadir: 40 chargers. Realistic simultaneous usage ~10–15% = 4–6 active.
  // At night fewer EVs arrive (overnight trickle charge pattern).
  useEffect(() => {
    const EV_TYPES = [
      { kw: 7.4, label: 'AC 7.4 kW — Standard',    prefix: 'W' },
      { kw: 22,  label: 'AC 22 kW — Rapide',        prefix: 'A' },
      { kw: 50,  label: 'DC 50 kW — Ultra-rapide',  prefix: 'B' },
    ];
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setEnergy(prev => {
          const evs  = [...prev.active_evs];
          const hour = new Date().getHours();
          const isNight = hour < 6 || hour >= 21;
          const maxEVs   = isNight ? 2 : 5;
          const plugProb = isNight ? 0.25 : 0.55;

          let newEvs: typeof evs;
          const rand = Math.random();
          if (rand < plugProb && evs.length < maxEVs) {
            const tp  = EV_TYPES[Math.floor(Math.random() * EV_TYPES.length)];
            newEvs = [...evs, {
              id: crypto.randomUUID(),
              plate: `${tp.prefix}${Math.floor(Math.random() * 90000 + 10000)}`,
              kw: tp.kw,
              chargerLabel: tp.label,
              startTime: new Date().toISOString(),
            }];
          } else if (evs.length > 0) {
            newEvs = evs.slice(1);
          } else {
            newEvs = evs;
          }

          const rate = parseFloat(newEvs.reduce((s, e) => s + e.kw, 0).toFixed(1));
          evRef.current = rate;

          // Refresh AI forecast with updated EV rate
          const nowHour = new Date().getHours();
          const hourIdx = hourlyTim.current.findIndex(t2 => new Date(t2).getHours() === nowHour);
          const safeIdx = hourIdx >= 0 ? hourIdx : 0;
          const { points, text, alert } = buildForecast(
            hourlyRad.current, hourlyTim.current, safeIdx, battRef.current, rate
          );

          const coveragePct = prev.is_day ? calcCoveragePct(solarRef.current, Math.max(rate, 10)) : 0;

          return {
            ...prev,
            active_evs:         newEvs,
            ev_consumption_rate: rate,
            solar_forecast:      points,
            ai_prediction_text:  text,
            bad_weather_alert:   alert,
            solar_coverage_pct:  coveragePct,
          };
        });
        schedule();
      }, 8000 + Math.random() * 12000); // EVs arrive every 8–20 seconds in simulation
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  // ── Main battery simulation loop (every 2 s = 6 simulated minutes) ──────
  // Uses REAL solar value from Open-Meteo (updated every 15 min via solarRef)
  // and real EV consumption (updated when EVs plug in/out via evRef).
  useEffect(() => {
    const loop = setInterval(() => {
      tickRef.current += 1;
      const DT_HOURS = 6 / 60;                         // each 2s tick = 6 sim-minutes
      const net      = solarRef.current - evRef.current;
      const delta    = (net / BATTERY_KWH) * 100 * DT_HOURS;
      battRef.current = Math.max(0, Math.min(100, battRef.current + delta));

      const lvl = parseFloat(battRef.current.toFixed(1));
      const now = new Date();
      const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const shouldPushFirebase = tickRef.current % 5 === 0; // every 10 s

      setEnergy(prev => ({
        ...prev,
        current_battery_level: lvl,
        battery_history: [
          ...prev.battery_history.slice(-59),
          { t: ts, v: Math.round(lvl), solar: solarRef.current, ev: evRef.current },
        ],
        firebase_log: shouldPushFirebase
          ? ([{
              timestamp: ts,
              current_battery_level: Math.round(lvl),
              weather_status: prev.weather_status,
              solar_generation_rate: solarRef.current,
              ev_consumption_rate: evRef.current,
              bad_weather_alert: prev.bad_weather_alert,
            } as FirebaseSnapshot, ...prev.firebase_log]).slice(0, 10)
          : prev.firebase_log,
      }));
    }, 2000);
    return () => clearInterval(loop);
  }, []);

  // ── Auth helpers ────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (response.status === 401) return false;
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    const payload: { user: ApiUser } = await response.json();
    const signedInUser = mapApiUser(payload.user);
    setUser(signedInUser);
    setAuthError(null);
    await refreshBookings(signedInUser.id);
    viewHistoryRef.current = ['landing'];
    setViewHistory(['landing']);
    viewRef.current = 'dashboard';
    setView('dashboard');
    return true;
  }, [refreshBookings]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name, email, password }),
    });
    if (response.status === 409) return false;
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    const payload: { user: ApiUser } = await response.json();
    const newUser = mapApiUser(payload.user);
    setUser(newUser);
    setBookings([]);
    setAuthError(null);
    await refreshBookings(newUser.id);
    viewHistoryRef.current = ['landing'];
    setViewHistory(['landing']);
    viewRef.current = 'dashboard';
    setView('dashboard');
    return true;
  }, [refreshBookings]);

  const logout = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    setUser(null);
    setBookings([]);
    setAuthError(null);
    setBookingError(null);
    viewHistoryRef.current = [];
    setViewHistory([]);
    viewRef.current = 'landing';
    setView('landing');
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    const preferences = loadProfilePreferences();
    preferences[user.email.toLowerCase()] = {
      plan: updatedUser.plan,
      walletBalance: updatedUser.walletBalance,
      joinedAt: updatedUser.joinedAt,
    };
    saveProfilePreferences(preferences);
  }, [user]);

  const updateProfileName = useCallback(async (name: string) => {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name }),
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    const payload: { user: ApiUser } = await response.json();
    setUser(prev => prev?.id === payload.user.id
      ? { ...prev, name: payload.user.full_name }
      : prev);
  }, []);

  const activeBooking = bookings.find(b => b.status === 'active' && b.userId === user?.id) ?? null;

  const createBooking = useCallback(async (draft: BookingDraft): Promise<Booking> => {
    if (!user || !draft.parkingLot) throw new Error('No user or lot');
    const response = await fetch(`${API_BASE_URL}/reservations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parking_id: draft.parkingLot.id,
        duration_hours: draft.duration,
        spot_type: draft.spotType,
      }),
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    const booking = mapApiBooking(await response.json() as ApiBooking);
    setBookings(prev => [booking, ...prev]);
    updateUser({
      walletBalance: Math.max(0, user.walletBalance - booking.price),
      totalBookings: user.totalBookings + 1,
      co2Saved: Math.round((user.co2Saved + booking.co2Saved) * 10) / 10,
    });
    return booking;
  }, [user, updateUser]);

  const cancelBooking = useCallback(async (id: string) => {
    const booking = bookings.find(item => item.id === id);
    if (!booking || !user) throw new Error('Reservation not found for this account.');
    const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    updateUser({
      walletBalance: user.walletBalance + Math.round(booking.price * 0.5 * 10) / 10,
    });
    await refreshBookings(user.id);
  }, [bookings, refreshBookings, updateUser, user]);

  const extendBooking = useCallback(async (id: string, extraHours: number): Promise<boolean> => {
    const b = bookings.find(x => x.id === id && x.status === 'active');
    if (!b || !user) return false;
    const cost = Math.round((b.price / b.duration) * extraHours * 100) / 100;
    if (user.walletBalance < cost) return false;
    const response = await fetch(`${API_BASE_URL}/reservations/${id}/extend`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_hours: extraHours }),
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response));
    updateUser({ walletBalance: user.walletBalance - cost });
    await refreshBookings(user.id);
    return true;
  }, [bookings, refreshBookings, updateUser, user]);

  const setBookingDraft = useCallback((u: Partial<BookingDraft>) =>
    setDraftState(p => ({ ...p, ...u })), []);

  const startBookingFor = useCallback((lot: ParkingLot, cityId: string, cityName: string) => {
    setDraftState({ parkingLot: lot, cityId, cityName, spotType: 'standard', duration: 2 });
    navigate('booking');
  }, [navigate]);

  // ── Sensor panel ────────────────────────────────────────────────────────
  const sensorEnter = useCallback((lotId: number, lotName: string, plate: string) => {
    const p = plate.trim().toUpperCase();
    if ((sensorOccupied[lotId] ?? []).includes(p)) return 'already_inside' as const;
    const lot = parkingLots.find(parking => parking.id === lotId);
    const simulatedCars = sensorOccupied[lotId]?.length ?? 0;
    if (!lot || lot.available - simulatedCars <= 0) return 'lot_full' as const;
    setSensorOc(prev => ({ ...prev, [lotId]: [...(prev[lotId] ?? []), p] }));
    const ev: SensorEvent = { id: crypto.randomUUID(), lotId, lotName, plate: p, direction: 'enter', timestamp: new Date().toISOString() };
    setSensorLog(prev => ([ev, ...prev] as SensorEvent[]).slice(0, 100));
    return 'ok' as const;
  }, [sensorOccupied, parkingLots]);

  const sensorExit = useCallback((lotId: number, lotName: string, plate: string) => {
    const p = plate.trim().toUpperCase();
    if (!(sensorOccupied[lotId] ?? []).includes(p)) return 'not_found' as const;
    setSensorOc(prev => ({ ...prev, [lotId]: (prev[lotId] ?? []).filter(x => x !== p) }));
    const ev: SensorEvent = { id: crypto.randomUUID(), lotId, lotName, plate: p, direction: 'exit', timestamp: new Date().toISOString() };
    setSensorLog(prev => ([ev, ...prev] as SensorEvent[]).slice(0, 100));
    return 'ok' as const;
  }, [sensorOccupied]);

  return (
    <AppContext.Provider value={{
      view, navigate, goBack, canGoBack: viewHistory.length > 0,
      user, login, register, logout, updateUser, updateProfileName, authError,
      bookings, activeBooking, createBooking, cancelBooking, extendBooking, bookingError,
      parkingLots, parkingLoading, parkingError,
      sensorOccupied, sensorLog, sensorEnter, sensorExit,
      bookingDraft, setBookingDraft, startBookingFor,
      energy,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
