export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: 'free' | 'standard' | 'premium';
  walletBalance: number;
  co2Saved: number;
  totalBookings: number;
  joinedAt: string;
}

export interface ParkingLot {
  id: number;
  name: string;
  capacity: number;
  available: number;
  price: number;
  evCharging: number;
  evAvailable: number;
  lat: number;
  lng: number;
  cityId: string;
  address: string;
  rating: number;
}

export interface City {
  id: string;
  name: string;
  nameAr: string;
  image: string;
  parkingLots: ParkingLot[];
}

export type SpotType = 'standard' | 'ev' | 'handicapped' | 'vip';
export type BookingStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface Booking {
  id: string;
  userId: string;
  parkingLotId: number;
  parkingLotName: string;
  cityId: string;
  cityName: string;
  spotType: SpotType;
  spotNumber: string;
  duration: number;
  startTime: string;
  endTime: string;
  price: number;
  status: BookingStatus;
  paymentMethod: 'wallet' | 'card';
  co2Saved: number;
  qrCodeToken?: string;
  canCancel?: boolean;
}

export type View =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'parking'
  | 'map'
  | 'booking'
  | 'my-bookings'
  | 'profile'
  | 'ev-charging'
  | 'energy'
  | 'qr';

export interface BookingDraft {
  parkingLot: ParkingLot | null;
  cityId: string;
  cityName: string;
  spotType: SpotType;
  duration: number;
}

// 'night' added so EnergyMonitor knows panels are inactive
export type WeatherStatus = 'sunny' | 'partly_cloudy' | 'rainy' | 'foggy' | 'night';

export interface ActiveEV {
  id: string;
  plate: string;
  kw: number;
  chargerLabel: string;
  startTime: string;
}

export interface FirebaseSnapshot {
  timestamp: string;
  current_battery_level: number;
  weather_status: WeatherStatus;
  solar_generation_rate: number;
  ev_consumption_rate: number;
  bad_weather_alert: boolean;
}

// One point in the hourly solar forecast returned by Open-Meteo
export interface SolarForecastPoint {
  hour: number;       // 0–23 local time
  label: string;      // "09:00"
  radiation: number;  // W/m²
  solar_kw: number;   // kW our panels will produce
  battery_projected: number; // % battery at that hour (AI projection)
}

export interface EnergyState {
  // ── Core simulation variables ────────────────────────────────────────────
  battery_capacity: number;         // kWh — always 500
  current_battery_level: number;    // %
  solar_generation_rate: number;    // kW  (from real irradiance)
  ev_consumption_rate: number;      // kW  (sum of active EVs)

  // ── Weather (from Open-Meteo) ────────────────────────────────────────────
  weather_status: WeatherStatus;
  temperature: number;              // °C
  cloud_cover: number;              // %
  is_day: boolean;
  irradiance: number;               // W/m² (raw from API)
  last_weather_fetch: string;       // ISO timestamp of last real fetch
  weather_fetch_ok: boolean;        // false = API unreachable, using fallback

  // ── AI forecast (next 6 hours from Open-Meteo hourly data) ──────────────
  solar_forecast: SolarForecastPoint[];
  ai_prediction_text: string;       // human-readable prediction
  daily_solar_kwh: number;          // kWh our panels will generate today
  solar_coverage_pct: number;       // % of daytime EV needs covered by solar

  // ── Alerts & history ────────────────────────────────────────────────────
  bad_weather_alert: boolean;
  active_evs: ActiveEV[];
  battery_history: { t: string; v: number; solar: number; ev: number }[];
  firebase_log: FirebaseSnapshot[];
}
