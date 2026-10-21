-- ============================================================================
-- PROJET ECOPARK MAROC — SCHÉMA POSTGRESQL
-- ============================================================================

-- 1. Activation de l'extension nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- Pour générer des identifiants uniques sécurisés (UUID v4)

-- ============================================================================
-- A. TABLES RELATIONNELLES STANDARDS (Données Transactionnelles ACID)
-- ============================================================================

-- 1. TABLE UTILISATEURS (Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,          -- Stocke le hash bcrypt/argon2 (jamais en clair)
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CLIENT',     -- 'CLIENT' ou 'ADMIN'
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Horodatage universel UTC
);

INSERT INTO users (email, hashed_password, full_name, role)
VALUES (
    'demo@ecopark.ma',
    '$argon2id$v=19$m=65536,t=3,p=4$xUd3GI041tkSMR5YNG/iuA$B79eFCD52T7dotw3TW2aaXkI3FKSX1diLWn/gY/kT6U',
    'Youssef Alami',
    'CLIENT'
)
ON CONFLICT (email) DO UPDATE
SET hashed_password = EXCLUDED.hashed_password;

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiration
    ON auth_sessions (expires_at);

-- 2. TABLE VILLES (Cities)
CREATE TABLE IF NOT EXISTS cities (
    id VARCHAR(32) PRIMARY KEY,                     -- Ex: 'casablanca', 'agadir'
    name VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL
);

-- 3. TABLE PARKINGS (Parking Lots)
CREATE TABLE IF NOT EXISTS parkings (
    id INTEGER PRIMARY KEY,
    city_id VARCHAR(32) NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    available_spots INTEGER NOT NULL CHECK (
        available_spots >= 0 AND available_spots <= capacity
    ),
    price_per_hour_mad NUMERIC(6, 2) NOT NULL CHECK (price_per_hour_mad >= 0),
    ev_chargers_total INTEGER NOT NULL DEFAULT 0 CHECK (ev_chargers_total >= 0),
    ev_chargers_available INTEGER NOT NULL DEFAULT 0 CHECK (
        ev_chargers_available >= 0
        AND ev_chargers_available <= ev_chargers_total
    ),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 0 AND rating <= 5)
);

-- 4. TABLE PLACES DE PARKING (Parking Spots)
CREATE TABLE IF NOT EXISTS parking_spots (
    id VARCHAR(10) PRIMARY KEY,                     -- Ex: 'A-01', 'A-02', 'B-01'
    parking_id INTEGER NOT NULL REFERENCES parkings(id) ON DELETE RESTRICT,
    zone VARCHAR(50) NOT NULL,                      -- 'Zone A (Ombragée Solaire)', 'Zone B (Standard)'
    has_ev_charger BOOLEAN NOT NULL DEFAULT FALSE,  -- Borne de recharge pour véhicule électrique
    spot_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE')),
    hourly_rate_mad NUMERIC(6, 2) NOT NULL DEFAULT 5.00 -- Tarif horaire en Dirhams (MAD)
);

ALTER TABLE parking_spots
    ADD COLUMN IF NOT EXISTS spot_type VARCHAR(20) NOT NULL DEFAULT 'standard';

DO $$
BEGIN
    ALTER TABLE parking_spots
        ADD CONSTRAINT chk_parking_spots_type
        CHECK (spot_type IN ('standard', 'ev', 'handicapped', 'vip'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

INSERT INTO cities (id, name, name_ar) VALUES
    ('casablanca', 'Casablanca', 'الدار البيضاء'),
    ('marrakech', 'Marrakech', 'مراكش'),
    ('rabat', 'Rabat', 'الرباط'),
    ('tangier', 'Tangier', 'طنجة'),
    ('agadir', 'Agadir', 'أكادير')
-- Si un id existe déjà (clé primaire), PostgreSQL ignore cette insertion au lieu
-- de lever une erreur. C'est utile si on relance le script, mais cela ne met pas
-- à jour la ville déjà présente.
ON CONFLICT (id) DO NOTHING;

INSERT INTO parkings (
    id, city_id, name, address, capacity, available_spots,
    price_per_hour_mad, ev_chargers_total, ev_chargers_available,
    latitude, longitude, rating
) VALUES
    (1, 'casablanca', 'Casa Anfa Parking', 'Bd Anfa, Casablanca', 1500, 423, 6, 50, 18, 33.589900, -7.635800, 4.5),
    (2, 'casablanca', 'Place Rachidi', 'Pl. Rachidi, Casablanca', 723, 156, 5, 15, 7, 33.585200, -7.618700, 4.2),
    (3, 'casablanca', 'Hypercentre Parking', 'Centre-Ville, Casablanca', 703, 89, 7, 20, 3, 33.591200, -7.611500, 4.0),
    (4, 'casablanca', 'Ligue Arabe', 'Bd de la Ligue Arabe, Casablanca', 325, 45, 5, 8, 5, 33.583400, -7.625600, 3.8),
    (5, 'casablanca', 'Triangle des Hôtels', 'Maarif, Casablanca', 550, 201, 8, 25, 12, 33.594500, -7.631200, 4.6),
    (6, 'marrakech', 'Gueliz Central', 'Av. Mohammed V, Marrakech', 800, 234, 5, 20, 9, 31.634600, -8.009100, 4.4),
    (7, 'marrakech', 'Médina Parking', 'Pl. Jemaa el-Fna, Marrakech', 400, 67, 4, 10, 4, 31.625800, -7.989100, 4.1),
    (8, 'marrakech', 'Hivernage Premium', 'Hivernage, Marrakech', 350, 123, 8, 15, 11, 31.623400, -8.012300, 4.7),
    (9, 'marrakech', 'Palmeraie Hub', 'Palmeraie, Marrakech', 600, 312, 6, 30, 20, 31.654300, -7.998700, 4.3),
    (10, 'rabat', 'Hassan Tower Parking', 'Av. Hassan II, Rabat', 900, 345, 5, 25, 14, 34.023900, -6.834900, 4.3),
    (11, 'rabat', 'Agdal Center', 'Agdal, Rabat', 650, 189, 6, 18, 8, 34.012300, -6.845600, 4.5),
    (12, 'rabat', 'Souissi Premium', 'Souissi, Rabat', 500, 234, 7, 20, 15, 34.001200, -6.856700, 4.6),
    (13, 'tangier', 'Port de Tanger', 'Port de Tanger, Tanger', 1200, 456, 6, 35, 22, 35.780400, -5.813600, 4.2),
    (14, 'tangier', 'Centre Ville', 'Centre-Ville, Tanger', 550, 123, 5, 15, 6, 35.767300, -5.803700, 4.0),
    (15, 'tangier', 'Malabata', 'Malabata, Tanger', 400, 89, 7, 12, 8, 35.789100, -5.791200, 4.4),
    (16, 'agadir', 'Marina Agadir — EcoPark', 'Marina d''Agadir, Agadir', 200, 134, 5, 40, 28, 30.427800, -9.598100, 4.9),
    (17, 'agadir', 'Centre Commercial', 'Av. du Prince Héritier, Agadir', 600, 198, 4, 18, 10, 30.419800, -9.589100, 4.1),
    (18, 'agadir', 'Founty Beach', 'Founty, Agadir', 450, 156, 6, 15, 9, 30.409100, -9.578900, 4.3)
-- Même principe ici : un parking dont l'id existe déjà n'est pas réinséré ni
-- modifié. Les autres erreurs de contraintes (par exemple une ville inconnue)
-- ne sont pas ignorées par cette clause.
ON CONFLICT (id) DO NOTHING;

-- Places fictives de démonstration pour le parking 16 (Agadir).
-- AVAILABLE correspond à une place libre ; OCCUPIED à une place occupée.
INSERT INTO parking_spots (
    id, parking_id, zone, has_ev_charger, spot_type, status, hourly_rate_mad
) VALUES
    ('A-01', 16, 'Zone A', FALSE, 'standard', 'AVAILABLE', 5.00),
    ('A-02', 16, 'Zone A', FALSE, 'standard', 'OCCUPIED', 5.00),
    ('A-03', 16, 'Zone A', FALSE, 'standard', 'AVAILABLE', 5.00)
ON CONFLICT (id) DO NOTHING;

-- Complète l'inventaire synthétique jusqu'à la capacité indiquée pour chaque parking.
-- Les statuts initiaux reflètent les disponibilités agrégées déjà déclarées.
WITH parking_state AS (
    SELECT
        p.id AS parking_id,
        p.capacity,
        p.available_spots,
        p.price_per_hour_mad,
        p.ev_chargers_total,
        p.ev_chargers_available,
        COUNT(s.id)::INTEGER AS existing_spots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')::INTEGER AS existing_available,
        COUNT(s.id) FILTER (WHERE s.spot_type = 'ev')::INTEGER AS existing_ev,
        COUNT(s.id) FILTER (
            WHERE s.spot_type = 'ev' AND s.status = 'AVAILABLE'
        )::INTEGER AS existing_ev_available,
        COUNT(s.id) FILTER (WHERE s.spot_type = 'handicapped')::INTEGER AS existing_handicapped,
        COUNT(s.id) FILTER (WHERE s.spot_type = 'vip')::INTEGER AS existing_vip
    FROM parkings p
    LEFT JOIN parking_spots s ON s.parking_id = p.id
    GROUP BY p.id
),
generated_spots AS (
    SELECT
        p.*,
        series.slot_number,
        ROW_NUMBER() OVER (PARTITION BY p.parking_id ORDER BY series.slot_number) AS generated_number,
        GREATEST(0, p.ev_chargers_total - p.existing_ev) AS ev_to_add,
        GREATEST(
            0,
            LEAST(
                p.ev_chargers_total - p.existing_ev,
                p.ev_chargers_available - p.existing_ev_available
            )
        ) AS ev_available_to_add,
        GREATEST(0, CEIL(p.capacity * 0.02)::INTEGER - p.existing_handicapped) AS handicapped_to_add,
        GREATEST(0, CEIL(p.capacity * 0.03)::INTEGER - p.existing_vip) AS vip_to_add
    FROM parking_state p
    CROSS JOIN LATERAL generate_series(
        1,
        GREATEST(0, p.capacity - p.existing_spots)
    ) AS series(slot_number)
)
INSERT INTO parking_spots (
    id, parking_id, zone, has_ev_charger, spot_type, status, hourly_rate_mad
)
SELECT
    'P' || parking_id::TEXT || '-' || LPAD(slot_number::TEXT, 4, '0'),
    parking_id,
    CASE WHEN slot_number % 2 = 0 THEN 'Zone B' ELSE 'Zone A' END,
    slot_number <= ev_to_add,
    CASE
        WHEN slot_number <= ev_to_add THEN 'ev'
        WHEN slot_number <= ev_to_add + handicapped_to_add THEN 'handicapped'
        WHEN slot_number <= ev_to_add + handicapped_to_add + vip_to_add THEN 'vip'
        ELSE 'standard'
    END,
    CASE
        WHEN slot_number <= ev_to_add
            THEN CASE WHEN generated_number <= ev_available_to_add THEN 'AVAILABLE' ELSE 'OCCUPIED' END
        WHEN generated_number - ev_to_add <= GREATEST(
            0,
            LEAST(
                capacity - existing_spots - ev_to_add,
                available_spots - existing_available - ev_available_to_add
            )
        ) THEN 'AVAILABLE'
        ELSE 'OCCUPIED'
    END,
    price_per_hour_mad * CASE
        WHEN slot_number <= ev_to_add THEN 1.4
        WHEN slot_number <= ev_to_add + handicapped_to_add THEN 0.8
        WHEN slot_number <= ev_to_add + handicapped_to_add + vip_to_add THEN 1.8
        ELSE 1.0
    END
FROM generated_spots
ON CONFLICT (id) DO NOTHING;

-- 5. TABLE RÉSERVATIONS (Reservations)
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    spot_id VARCHAR(10) NOT NULL REFERENCES parking_spots(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'
    total_amount_mad NUMERIC(8, 2) NOT NULL,
    qr_code_token VARCHAR(255) UNIQUE NOT NULL,      -- Jeton cryptographique pour accès borne/barrière
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Règle d'intégrité métier : l'heure de départ doit être strictement postérieure à l'heure d'arrivée
    CONSTRAINT chk_reservation_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_start
    ON reservations (user_id, start_time DESC);

CREATE TABLE IF NOT EXISTS access_events (
    event_id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('entry', 'exit')),
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_events_reservation_time
    ON access_events (reservation_id, occurred_at);

-- Historique terminé fictif pour conserver l'exemple de démonstration.
INSERT INTO reservations (
    id, user_id, spot_id, start_time, end_time, status, total_amount_mad, qr_code_token
)
SELECT
    sample.id,
    demo.id,
    spot.id,
    sample.start_time,
    sample.start_time + sample.duration_hours * INTERVAL '1 hour',
    'COMPLETED',
    sample.duration_hours * spot.hourly_rate_mad,
    'demo-history-' || sample.id::TEXT
FROM (
    VALUES
        ('00000000-0000-4000-8000-000000000001'::UUID, 16, 'standard', 2.0::NUMERIC, NOW() - INTERVAL '2 days'),
        ('00000000-0000-4000-8000-000000000002'::UUID, 1, 'ev', 1.5::NUMERIC, NOW() - INTERVAL '7 days'),
        ('00000000-0000-4000-8000-000000000003'::UUID, 6, 'standard', 3.0::NUMERIC, NOW() - INTERVAL '14 days')
) AS sample(id, parking_id, spot_type, duration_hours, start_time)
CROSS JOIN users demo
CROSS JOIN LATERAL (
    SELECT s.id, s.hourly_rate_mad
    FROM parking_spots s
    WHERE s.parking_id = sample.parking_id
      AND s.spot_type = sample.spot_type
    ORDER BY s.id
    LIMIT 1
) spot
WHERE demo.email = 'demo@ecopark.ma'
ON CONFLICT (id) DO NOTHING;

-- 6. TABLE SESSIONS DE RECHARGE VÉHICULE ÉLECTRIQUE (EV Charging)
CREATE TABLE IF NOT EXISTS charging_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    spot_id VARCHAR(10) NOT NULL REFERENCES parking_spots(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,                            -- NULL tant que la session est en cours
    energy_kwh NUMERIC(6, 2) NOT NULL DEFAULT 0.0,   -- Énergie délivrée en kWh
    peak_power_kw NUMERIC(5, 2) NOT NULL DEFAULT 0.0,-- Puissance crête (ex: 22.0 kW)
    total_cost_mad NUMERIC(8, 2) NOT NULL DEFAULT 0.0
);

-- 7. HISTORIQUE DES DÉTECTIONS DE LA CAMÉRA
-- Chaque ligne conserve un résultat détecté. L'état courant reste dans parking_spots.status.
CREATE TABLE IF NOT EXISTS camera_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_id VARCHAR(10) NOT NULL REFERENCES parking_spots(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('free', 'occupied')),
    occurred_at TIMESTAMPTZ NOT NULL
);

-- Accélère la recherche de l'historique d'une place du plus récent au plus ancien.
CREATE INDEX IF NOT EXISTS idx_camera_events_spot_time
    ON camera_events (spot_id, occurred_at DESC);
