# EcoPark Maroc — Guide de lancement

EcoPark comporte deux processus : une API FastAPI connectée à PostgreSQL et une interface React/Vite. Pour utiliser les fonctionnalités authentification, réservations et disponibilités, démarrez les deux.

## Prérequis

- Python et les dépendances de `backend/requirements.txt`
- Node.js 18 ou supérieur et npm
- Une instance PostgreSQL accessible
- Une variable `DATABASE_URL` correctement configurée pour le backend
- Le schéma et les données de démonstration initialisés avec `backend/database/init_schema.sql`

## Lancement sous Windows (PowerShell)

### 1. Démarrer l'API

Dans un premier terminal, placez-vous à la racine du projet :

```powershell
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

L'API écoute par défaut sur `http://127.0.0.1:8000`.

### 2. Démarrer l'interface

Dans un second terminal :

```powershell
Set-Location ecopark_v4\app
npm install
npm run dev
```

Ouvrez `http://localhost:5173`.

### 3. Arrêter les processus

Dans chaque terminal, appuyez sur `Ctrl+C`. Le navigateur ne doit pas être fermé pour arrêter les serveurs.

## Simulateurs backend optionnels

L'API doit être démarrée avant les simulateurs. Depuis un terminal à la racine du projet :

```powershell
python backend\simulators\camera_simulator.py
```

Ce simulateur alterne l'état `free`/`occupied` de la place `A-01` du parking 16 et envoie les événements à l'API. Il simule la sortie d'un détecteur ; il ne traite aucune image.

Pour tester séparément le parcours de réservation et d'accès QR :

```powershell
python backend\simulators\vehicle_simulator.py
```

Ce second programme utilise le compte de démonstration configuré dans le code. Les deux simulateurs ont des objectifs distincts et ne sont pas un détecteur visuel connecté.

## Construire l'interface

Depuis `ecopark_v4\app` :

```powershell
npm run build
npm run preview
```

## Limites du prototype

- Les données de stationnement et les événements sont des données de démonstration.
- Le dépôt de détection visuelle de places n'est pas encore branché à l'API ; le simulateur caméra envoie directement des états prédéfinis.
- Les paiements, le portefeuille et les prévisions énergétiques ne sont pas reliés à des systèmes financiers ou à des équipements physiques.
- Les prévisions météo de la page énergie proviennent d'Open-Meteo ; les mesures de production, de consommation et de batterie restent simulées ou estimées.
