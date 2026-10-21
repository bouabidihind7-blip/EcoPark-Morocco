# EcoPark Maroc — Prototype de stationnement intelligent

EcoPark Maroc est un prototype de réservation et de suivi de places dans 18 parkings de démonstration répartis dans cinq villes. Il comprend une interface web React, une API FastAPI et une base PostgreSQL. Les disponibilités présentées sont des données de démonstration mises à jour par l'API et par des simulateurs ; elles ne proviennent pas encore de caméras physiques.

**Stack:** React 19 · TypeScript · Tailwind CSS · Vite · FastAPI · PostgreSQL  
**Demo account:** use the locally configured demo credentials. Do not publish a real password.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [App Navigation Overview](#2-app-navigation-overview)
3. [Landing Page](#3-landing-page)
4. [Login & Registration](#4-login--registration)
5. [Dashboard](#5-dashboard)
6. [Parking Browser](#6-parking-browser)
7. [Booking Flow](#7-booking-flow)
8. [My Bookings](#8-my-bookings)
9. [EV Charging](#9-ev-charging)
10. [Profile & Wallet](#10-profile--wallet)
11. [Détection et simulation de l'occupation](#11-détection-et-simulation-de-loccupation)
12. [Flux des événements de places](#12-flux-des-événements-de-places)
13. [Data & State Architecture](#13-data--state-architecture)

---

## 1. Quick Start

Start the backend from the project root, then start the frontend from `ecopark_v4/app`. The backend needs a PostgreSQL connection configured in its environment.

```powershell
# Terminal 1 — project root
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

```powershell
# Terminal 2 — ecopark_v4\app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To build for production:
```bash
npm run build
```

---

## 2. App Navigation Overview

EcoPark is a **single-page app** — there are no URL routes. Navigation is managed through a `view` state in `AppContext`. The bottom navigation bar (visible after login) gives you access to all five main sections.

```
Landing → Auth → Dashboard ─┬─ Parkings → Booking Flow
                             ├─ EV Charging
                             ├─ My Bookings
                             └─ Profile
```

| Screen | How to get there |
|---|---|
| Landing | Default on first load / after logout |
| Login / Register | "Commencer" or "Se connecter" on landing |
| Dashboard | After login — the home screen |
| Parkings | Bottom nav → 📍 Parkings |
| Booking Flow | Tap any parking card |
| EV Charging | Bottom nav → ⚡ Recharge |
| My Bookings | Bottom nav → 🕐 Mes Resas |
| Profile | Bottom nav → 👤 Profil |

---

## 3. Landing Page

The public-facing marketing page. No login required.

**What you'll find:**
- Hero section with demonstration data (18 parkings · 391 EV chargers · 5 cities)
- How it works — 3-step walkthrough (Search → Book → Park)
- City showcase cards for Casablanca, Marrakech, Rabat, Tangier, Agadir
- Pricing plans: Éco-Découverte (free), Standard (49 MAD/month), Premium (99 MAD/month)
- Feature highlights — Availability from the API, EV charging and simulated CO₂ estimates

**Navigation from here:**
- Click **"Commencer"** or **"Se connecter"** → goes to Auth screen
- All CTAs lead to Auth

---

## 4. Login & Registration

**File:** `src/pages/Auth.tsx`

The auth screen has two tabs — **Connexion** (login) and **Inscription** (register).

### Login
1. Enter your email and password
2. Click **"Se connecter"**
3. On success, you land on the Dashboard

**Quick demo login:**
- Email: `demo@ecopark.ma`
- Password: `EcoParkDemo2026!`

### Registration
1. Switch to the **Inscription** tab
2. Enter your full name, email, and a password (min 8 characters)
3. Click **"Créer mon compte"**
4. A demonstration wallet balance is shown in the interface. Wallet operations are not real payments and are not stored as financial transactions in PostgreSQL.

**Notes:**
- User accounts are stored in PostgreSQL.
- Passwords are hashed with Argon2; the browser session uses an HttpOnly cookie.

---

## 5. Dashboard

**File:** `src/pages/Dashboard.tsx`

The home screen after login. Parking availability and reservations are refreshed from the backend.

### What you see:

**Top bar:**
- EcoPark logo (top left)
- If you have an active booking, a green pulsing **"Réservation active"** badge appears — tap it to jump to My Bookings

**Stats row (3 cards):**
- 💰 **Portefeuille** — Demonstration balance managed by the frontend
- 🌿 **CO₂ économisé** — Estimated value calculated by the application
- 🅿️ **Réservations** — Total booking count

**Active booking card** (shown only if you have a booking in progress):
- Parking name, spot number, spot type (Standard / EV / PMR / VIP)
- Countdown timer in real time (hours, minutes, seconds)
- Buttons to extend a reservation or cancel it; wallet changes remain frontend-only.

**City selector:**
- Tap a city chip (Casablanca, Marrakech, Rabat, Tangier, Agadir) to filter the list below
- The live available spot count for the selected city updates every 20 seconds

**Parking lot cards:**
- Shows name, address, star rating, occupancy bar (green > 50% free, yellow > 20%, red < 20%)
- Live available count / capacity
- EV charger availability
- Tap any card → jumps straight to Booking Flow for that parking

**Local event panel:**
- Lets a presenter manually simulate entry and exit events in frontend memory.
- These events do not come from camera images and are not saved to PostgreSQL.

**Quick action buttons:**
- My Bookings shortcut
- EV Charging shortcut

---

## 6. Parking Browser

**File:** `src/pages/ParkingBrowse.tsx`

Browse and search all 18 parking lots across Morocco.

### Step-by-step:

1. **Search bar** — Type a parking name, address, or city name. Results filter in real time.
2. **City chips** — Tap "Toutes" to see all, or tap a city name to filter by city only.
3. **Filter button** — Tap the slider icon to toggle the filter panel.
4. **EV filter** — Tap the ⚡ Bornes VE toggle to show only lots with available EV chargers.
5. **Sort options** (top right):
   - **Dispo** — Sort by most available spots (default)
   - **Prix** — Sort by cheapest hourly rate
   - **Note** — Sort by highest star rating
6. **Result cards** — Each card shows:
   - Name, rating, city, address
   - Live available/capacity count (color-coded)
   - Occupancy progress bar
   - EV charger badge (if available)
   - Price per hour in MAD
7. **Tap any card** → opens the Booking Flow for that lot

---

## 7. Booking Flow

**File:** `src/pages/BookingFlow.tsx`

A 4-step wizard to reserve a parking spot.

### Step 1 — Choose Spot Type

| Type | Multiplier | Description |
|---|---|---|
| Standard | ×1.0 | Regular spot |
| Recharge VE | ×1.4 | EV charging included |
| PMR | ×0.8 | Accessible, reduced rate |
| VIP | ×1.8 | Premium reserved spot |

Tap a card to select. The price preview updates instantly at the bottom.

### Step 2 — Choose Duration

Tap one of the preset durations:
- 1 heure, 2 heures, 3 heures, 4 heures, Demi-journée (8h), Journée complète (24h)

The total price is calculated as: `lot_price × spot_multiplier × duration_hours`.

### Step 3 — Payment

- Shows the full price breakdown
- The interface checks the demonstration wallet balance before creating a reservation.
- The wallet is frontend-only; no money is charged or recorded as a financial transaction.
- Tap **"Confirmer la réservation"** to complete

### Step 4 — Confirmation

- Your spot number is shown (e.g. `A-07`, `EV-12`, `H-03`, `VIP-01`)
- A QR code is generated from the random token returned by the backend for that reservation.
- Tap **"Voir mes réservations"** to go to My Bookings, or **"Retour"** to go back to parkings

---

## 8. My Bookings

**File:** `src/pages/MyBookings.tsx`

View and manage all your reservations.

### Tabs:
- **Active** — Currently running bookings
- **Historique** — Completed and cancelled bookings

### On each active booking card:
- Parking name, city, date/time range
- Spot number and type
- Live countdown timer
- CO₂ saved for this booking
- **Extend buttons** — Add time through the backend; the displayed wallet deduction is local and uses the reservation's hourly rate.
- **Cancel button** — Cancels the booking through the backend; the 50% wallet refund is simulated in frontend state.

### Booking statuses:
| Status | Badge color | Meaning |
|---|---|---|
| Active | Green | Currently in progress |
| Completed | Gray | Automatically expired |
| Cancelled | Red | Manually cancelled |

Bookings auto-expire (status changes to "completed") when their end time passes. The app checks every 30 seconds.

---

## 9. EV Charging

**File:** `src/pages/EVCharging.tsx`

Find EV charging stations across all parking lots.

- Lists all parking lots that have EV chargers
- Shows available charger count vs. total
- Availability updates in real time alongside general parking data
- Each card shows the lot address and city
- Tap a card to book a spot with the EV type selected automatically

---

## 10. Profile & Wallet

**File:** `src/pages/Profile.tsx`

Manage your account, subscription, and wallet.

### Sections:

**Profile info:**
- Edit your display name through the backend
- Your email is displayed (non-editable)
- Member since date

**Subscription plan:**
- View your current plan (Éco-Découverte / Standard / Premium)
- Discount rates are displayed as a proposed feature; the backend does not apply them to reservation prices.
- Upgrade buttons for Standard (49 MAD/month) and Premium (99 MAD/month)

**Wallet:**
- Current balance in MAD
- Top-up buttons: +50 MAD, +100 MAD, +200 MAD (frontend demonstration only)
- Transaction history (placeholder — extendable)

**Stats:**
- Total bookings made
- Total CO₂ saved in kg

**Logout:**
- Clears session, returns to Landing page

---

## 11. Parking-space detection and simulation

The external [8harath/Car-Parking-Detection](https://github.com/8harath/Car-Parking-Detection) repository estimates whether configured parking-space regions are **free** or **occupied**. Its image workflow combines OpenCV processing with YOLOv8 vehicle detection; its video workflow mainly applies a pixel threshold to configured space regions. EcoPark's relevant output is the status of each space, not vehicle identity.

This vision repository is independent and **is not connected to the EcoPark API**. Its output is not currently stored in the EcoPark database.

### Simulators connected to the API

- `backend/simulators/camera_simulator.py` alternates `free` and `occupied` for space `A-01` at parking 16, then posts each event to `/camera-events` every two seconds. The API persists the space status in PostgreSQL. This simulates events; it does not process images.
- `backend/simulators/vehicle_simulator.py` tests a separate flow: demo login, reservation creation, then QR-token access events. It does not detect visual space occupancy.
- `SensorPanel.tsx` is a local entry/exit demonstration panel. It keeps state in frontend memory and does not update PostgreSQL availability.

Future detector integration must send at least the parking ID, space ID, and `free` or `occupied` status. The API must validate these fields before updating the space.

---

## 12. Parking event flow

### Flow verified with the backend simulator

```text
camera_simulator.py
        | POST /camera-events
        | { parking_id, spot_id, status, occurred_at }
        v
FastAPI validates the event and target space
        |
        v
PostgreSQL updates the space status
        |
        v
Frontend reloads availability aggregates from the API
```

The GitHub detector still needs adaptation to produce this event and call the API. That integration is not implemented. Camera events describe a space; reservations and QR access use separate API routes.

---

## 13. Data and state architecture

### File structure

```text
app/
|-- index.html
|-- tailwind.config.js
|-- README.md
`-- src/
    |-- App.tsx                Root view router
    |-- types.ts               TypeScript interfaces
    |-- data.ts                City/lot data and pricing constants
    |-- context/
    |   `-- AppContext.tsx     API state and local presentation state
    |-- components/
    |   |-- SensorPanel.tsx    Local entry/exit demonstration panel
    |   `-- ui/                Reusable UI primitives
    `-- pages/                 Application screens
```

The FastAPI backend is in `backend/`. Authentication and reservations use PostgreSQL; an HttpOnly cookie carries the browser session. Some presentation preferences and demonstration wallet/plan values remain in browser storage or memory; they are not financial transactions.

### Browser storage and in-memory state

| State | Contents |
|---|---|
| `ecopark_theme` | Selected light/dark theme |
| Profile preferences | Demonstration wallet and plan values, where used |
| Sensor panel | Simulated entry/exit events held in frontend memory |

### Availability update cadence

| Source | Frequency | Effect |
|---|---|---|
| Frontend API refresh | About every 20 seconds | Reloads parking and charger counts from the backend |
| Backend camera simulator | Every 2 seconds | Alternates space `A-01` at parking 16 |
| Booking and access API | On user action | Persists reservations and QR access events |

### Pricing and estimates

```text
reservation = hourlyBasePrice * spaceMultiplier * durationHours

spaceMultiplier:
  standard    -> 1.0
  ev          -> 1.4
  handicapped -> 0.8
  vip         -> 1.8

estimatedCO2Saved (kg) = durationHours * 0.12
```

The CO2 value is an application estimate, not a measured emissions reduction. Wallet operations and payment-provider settlement are not integrated.
