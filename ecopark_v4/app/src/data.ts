import type { City } from './types';

// ── MARINA AGADIR — Notre parking de référence ─────────────────────────────
// 4 étages × 50 places = 200 places totales
// Toit (étage 4) : 625 m² de panneaux solaires (50 places × ~12.5 m²)
// Irradiation solaire Agadir : ~5.8 kWh/m²/jour (3 300 h/an)
// Puissance crête solaire : ~78 kW
// Capacité batterie centrale : 500 kWh (5 racks × 100 kWh)
export const MARINA_AGADIR_ID = 16;

export const citiesData: City[] = [
  {
    id: 'casablanca',
    name: 'Casablanca',
    nameAr: 'الدار البيضاء',
    image: '/casablanca-city.jpg',
    parkingLots: [
      { id: 1,  name: 'Casa Anfa Parking',    capacity: 1500, available: 423, price: 6, evCharging: 50, evAvailable: 18, lat: 33.5899, lng: -7.6358, cityId: 'casablanca', address: 'Bd Anfa, Casablanca',             rating: 4.5 },
      { id: 2,  name: 'Place Rachidi',         capacity:  723, available: 156, price: 5, evCharging: 15, evAvailable:  7, lat: 33.5852, lng: -7.6187, cityId: 'casablanca', address: 'Pl. Rachidi, Casablanca',         rating: 4.2 },
      { id: 3,  name: 'Hypercentre Parking',   capacity:  703, available:  89, price: 7, evCharging: 20, evAvailable:  3, lat: 33.5912, lng: -7.6115, cityId: 'casablanca', address: 'Centre-Ville, Casablanca',        rating: 4.0 },
      { id: 4,  name: 'Ligue Arabe',           capacity:  325, available:  45, price: 5, evCharging:  8, evAvailable:  5, lat: 33.5834, lng: -7.6256, cityId: 'casablanca', address: 'Bd de la Ligue Arabe, Casablanca',rating: 3.8 },
      { id: 5,  name: 'Triangle des Hôtels',   capacity:  550, available: 201, price: 8, evCharging: 25, evAvailable: 12, lat: 33.5945, lng: -7.6312, cityId: 'casablanca', address: 'Maarif, Casablanca',              rating: 4.6 },
    ],
  },
  {
    id: 'marrakech',
    name: 'Marrakech',
    nameAr: 'مراكش',
    image: '/marrakech-city.jpg',
    parkingLots: [
      { id: 6,  name: 'Gueliz Central',       capacity: 800, available: 234, price: 5, evCharging: 20, evAvailable:  9, lat: 31.6346, lng: -8.0091, cityId: 'marrakech', address: 'Av. Mohammed V, Marrakech',    rating: 4.4 },
      { id: 7,  name: 'Médina Parking',        capacity: 400, available:  67, price: 4, evCharging: 10, evAvailable:  4, lat: 31.6258, lng: -7.9891, cityId: 'marrakech', address: 'Pl. Jemaa el-Fna, Marrakech', rating: 4.1 },
      { id: 8,  name: 'Hivernage Premium',     capacity: 350, available: 123, price: 8, evCharging: 15, evAvailable: 11, lat: 31.6234, lng: -8.0123, cityId: 'marrakech', address: 'Hivernage, Marrakech',         rating: 4.7 },
      { id: 9,  name: 'Palmeraie Hub',         capacity: 600, available: 312, price: 6, evCharging: 30, evAvailable: 20, lat: 31.6543, lng: -7.9987, cityId: 'marrakech', address: 'Palmeraie, Marrakech',         rating: 4.3 },
    ],
  },
  {
    id: 'rabat',
    name: 'Rabat',
    nameAr: 'الرباط',
    image: '/rabat-city.jpg',
    parkingLots: [
      { id: 10, name: 'Hassan Tower Parking', capacity: 900, available: 345, price: 5, evCharging: 25, evAvailable: 14, lat: 34.0239, lng: -6.8349, cityId: 'rabat', address: 'Av. Hassan II, Rabat', rating: 4.3 },
      { id: 11, name: 'Agdal Center',         capacity: 650, available: 189, price: 6, evCharging: 18, evAvailable:  8, lat: 34.0123, lng: -6.8456, cityId: 'rabat', address: 'Agdal, Rabat',         rating: 4.5 },
      { id: 12, name: 'Souissi Premium',      capacity: 500, available: 234, price: 7, evCharging: 20, evAvailable: 15, lat: 34.0012, lng: -6.8567, cityId: 'rabat', address: 'Souissi, Rabat',       rating: 4.6 },
    ],
  },
  {
    id: 'tangier',
    name: 'Tangier',
    nameAr: 'طنجة',
    image: '/tangier-city.jpg',
    parkingLots: [
      { id: 13, name: 'Port de Tanger', capacity: 1200, available: 456, price: 6, evCharging: 35, evAvailable: 22, lat: 35.7804, lng: -5.8136, cityId: 'tangier', address: 'Port de Tanger, Tanger',  rating: 4.2 },
      { id: 14, name: 'Centre Ville',   capacity:  550, available: 123, price: 5, evCharging: 15, evAvailable:  6, lat: 35.7673, lng: -5.8037, cityId: 'tangier', address: 'Centre-Ville, Tanger',   rating: 4.0 },
      { id: 15, name: 'Malabata',       capacity:  400, available:  89, price: 7, evCharging: 12, evAvailable:  8, lat: 35.7891, lng: -5.7912, cityId: 'tangier', address: 'Malabata, Tanger',        rating: 4.4 },
    ],
  },
  {
    id: 'agadir',
    name: 'Agadir',
    nameAr: 'أكادير',
    image: '/agadir-city.jpg',
    parkingLots: [
      {
        // ★ NOTRE PARKING PILOTE ★
        id: 16,
        name: 'Marina Agadir — EcoPark',
        capacity:   200,   // 4 étages × 50 places
        available:  134,
        price:        5,
        evCharging:  40,   // 40 bornes EV (20% des places)
        evAvailable: 28,
        lat:  30.4278,
        lng:  -9.5981,
        cityId: 'agadir',
        address: 'Marina d\'Agadir, Agadir',
        rating: 4.9,
      },
      { id: 17, name: 'Centre Commercial', capacity: 600, available: 198, price: 4, evCharging: 18, evAvailable: 10, lat: 30.4198, lng: -9.5891, cityId: 'agadir', address: 'Av. du Prince Héritier, Agadir', rating: 4.1 },
      { id: 18, name: 'Founty Beach',      capacity: 450, available: 156, price: 6, evCharging: 15, evAvailable:  9, lat: 30.4091, lng: -9.5789, cityId: 'agadir', address: 'Founty, Agadir',                  rating: 4.3 },
    ],
  },
];

export const PRICING_PLANS = [
  { id: 'free',     name: 'Éco-Découverte', price:  0, discount:  0 },
  { id: 'standard', name: 'Standard',        price: 49, discount: 10 },
  { id: 'premium',  name: 'Premium',          price: 99, discount: 20 },
];

export const SPOT_PRICES: Record<string, number> = {
  standard:    1.0,
  ev:          1.4,
  handicapped: 0.8,
  vip:         1.8,
};

// Durées pour la recharge EV (5min, 15min, 30min, 1h, 2h, 4h)
export const EV_DURATION_OPTIONS = [
  { value: 5/60,  label: '5 min',   shortLabel: '5m'  },
  { value: 15/60, label: '15 min',  shortLabel: '15m' },
  { value: 0.5,   label: '30 min',  shortLabel: '30m' },
  { value: 1,     label: '1 heure', shortLabel: '1h'  },
  { value: 2,     label: '2 heures',shortLabel: '2h'  },
  { value: 4,     label: '4 heures',shortLabel: '4h'  },
];

// Durées pour parking standard
export const DURATION_OPTIONS = [
  { value: 1,  label: '1 heure'              },
  { value: 2,  label: '2 heures'             },
  { value: 3,  label: '3 heures'             },
  { value: 4,  label: '4 heures'             },
  { value: 8,  label: 'Demi-journée (8h)'    },
  { value: 24, label: 'Journée complète'     },
];

export function generateSpotNumber(type: string): string {
  const prefix = { standard: 'A', ev: 'EV', handicapped: 'H', vip: 'VIP' }[type] || 'A';
  return `${prefix}-${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`;
}

export function calcCO2Saved(durationHours: number): number {
  return Math.round(durationHours * 0.12 * 10) / 10;
}
