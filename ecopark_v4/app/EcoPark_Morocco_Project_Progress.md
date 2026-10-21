# EcoPark Maroc — État actuel du prototype

**Mise à jour :** 20 octobre 2026  
**Projet :** EcoPark Maroc — Smart & Green Parking  
**Équipe :** EnerTech Group — projet accompagné par Ecorise

Ce document décrit ce qui fonctionne dans le prototype, ce qui est simulé et ce qui reste à réaliser. Le rapport de compétition original (`RAPP Competition ver 2.pdf`) est conservé intact ; la version jury éditable est `RAPPORT_FINAL_ECOPARK.tex`.

## 1. Contexte et objectif

EcoPark explore une plateforme de réservation de stationnement et de suivi de places pour Casablanca, Marrakech, Rabat, Tanger et Agadir. Le prototype réunit une interface conducteur, une API et une base de démonstration. Il sert à éprouver les flux logiciels ; il ne constitue pas encore un déploiement dans des parkings physiques.

La version initiale du dossier mentionne que 30 à 40 % du trafic urbain serait dû à la recherche de stationnement, sans référence vérifiable associée. Ce chiffre ne doit pas être présenté comme un résultat mesuré par EcoPark et doit être sourcé avant toute réutilisation.

## 2. Inventaire de démonstration

Les capacités suivantes sont celles des données initiales du prototype. Les disponibilités changent après les réservations et événements de simulation.

| Ville | Parkings | Capacité de places | Bornes VE |
|---|---:|---:|---:|
| Casablanca | 5 | 3 801 | 118 |
| Marrakech | 4 | 2 150 | 75 |
| Rabat | 3 | 2 050 | 63 |
| Tanger | 3 | 2 150 | 62 |
| Agadir | 3 | 1 250 | 73 |
| **Total** | **18** | **11 401** | **391** |

Dans les données statiques initiales, 3 574 places et 209 bornes sont disponibles. Ce sont des valeurs de départ, pas des garanties de disponibilité en temps réel.

## 3. Architecture logicielle

```text
React 19 / TypeScript / Vite
              │ HTTP + cookie de session
              ▼
FastAPI / Python
              │ psycopg
              ▼
PostgreSQL
```

- **Frontend :** navigation monopage, réservation, consultation des parkings, profil, QR et tableau de bord énergie.
- **Backend :** routes d'authentification, inventaire des parkings, réservations, événements caméra et événements d'accès.
- **Base de données :** comptes, parkings, places, réservations, sessions et événements persistés.
- **Authentification :** mots de passe hachés avec Argon2 ; session portée par un cookie HttpOnly.

Les réservations et événements pris en charge par l'API sont persistants. Le portefeuille et le paiement ne sont pas des services financiers : les montants affichés et les opérations de remboursement/rechargement sont des éléments de démonstration côté interface.

## 4. Détection de places et simulateurs

Le dépôt [8harath/Car-Parking-Detection](https://github.com/8harath/Car-Parking-Detection) illustre une approche de vision par ordinateur dont le résultat est l'état d'une place : `free` ou `occupied`. Le parcours image emploie OpenCV et YOLOv8 ; le parcours vidéo repose principalement sur le traitement OpenCV et un seuil de pixels appliqué aux zones de places définies. Les performances annoncées dans le dépôt externe n'ont pas été reproduites ni validées dans le prototype EcoPark.

**Le dépôt de vision n'est pas connecté à l'API EcoPark.** En particulier, aucune image de caméra n'est actuellement traitée par l'application.

| Composant | Fonction réellement exécutée | Persistance |
|---|---|---|
| `backend/simulators/camera_simulator.py` | Alterne toutes les 2 secondes `free`/`occupied` pour `A-01`, parking 16, puis appelle `POST /camera-events` | L'API met à jour PostgreSQL |
| `backend/simulators/vehicle_simulator.py` | Crée une réservation de démonstration et envoie des événements d'accès liés au jeton QR | L'API persiste réservation et événements d'accès |
| `SensorPanel.tsx` | Simule manuellement des entrées/sorties dans l'interface | État frontend uniquement ; aucune mise à jour de disponibilité PostgreSQL |

Le prochain raccordement au détecteur devra convertir son résultat en événement EcoPark (identifiant du parking, identifiant de la place, statut et horodatage), appeler l'API et traiter ses réponses et erreurs. Ce raccordement doit être testé séparément du simulateur.

## 5. Réservation, accès et paiement

- L'utilisateur peut créer un compte, se connecter et consulter les parkings depuis l'interface.
- Une réservation validée est attribuée à une place et enregistrée dans PostgreSQL.
- Un jeton QR aléatoire permet de vérifier les événements d'entrée et de sortie via des routes backend distinctes.
- Le simulateur véhicule éprouve le parcours logiciel ; il n'actionne pas de barrière physique.
- Le portefeuille, les paiements bancaires et les remboursements réels ne sont pas intégrés.
- L'économie de CO₂ affichée est une estimation calculée par le logiciel (0,12 kg par heure de réservation), et non une mesure instrumentée.

## 6. Module énergie et pilote envisagé

La page énergie récupère des données météorologiques/irradiance via Open-Meteo. La puissance solaire, le niveau de batterie, la consommation des véhicules électriques et les prévisions affichés restent des calculs ou simulations ; aucun panneau, onduleur, batterie ou véhicule physique ne transmet de mesures au prototype.

Les caractéristiques citées dans le dossier pour le pilote d'Agadir — 200 places, 40 bornes, 625 m² de panneaux et une batterie de 500 kWh — sont des spécifications de conception, pas des équipements installés et vérifiés.

Les ordres de grandeur de 225 MWh/an et 130,5 tonnes de CO₂/an présents dans le dossier sont des projections fondées sur des hypothèses de surface, d'ensoleillement, de rendement et de facteur d'émission. Ils ne sont pas mesurés par l'application et doivent être recalculés et sourcés avant toute affirmation d'impact.

Les forfaits à 49 MAD et 99 MAD par mois figurent dans l'interface comme proposition commerciale. Le prototype ne collecte pas ces abonnements.

## 7. Vérifications réalisées

- Build frontend avec `npm run build` : réussi lors de la dernière vérification documentée.
- Compilation syntaxique des modules Python ciblés avec `python -m py_compile` : réussie.
- Vérifications d'API de démonstration : connexion et vérification de session HTTP 200 ; création de réservation HTTP 201 ; la réservation de test a ensuite été annulée.
- Initialisation de l'inventaire de démonstration : 18 parkings, 11 401 places et 391 bornes.

Ces contrôles valident le flux logiciel de démonstration. Ils ne valident ni la détection visuelle sur des caméras EcoPark, ni la précision du dépôt externe, ni des équipements ou paiements réels.

## 8. Prochaines étapes recommandées

1. Définir le format d'événement commun entre le détecteur, l'API et PostgreSQL ; couvrir les statuts inconnus, événements répétés, horodatages désordonnés et indisponibilité réseau.
2. Adapter le détecteur externe pour envoyer les états de places à l'API, puis tester une place et une séquence vidéo contrôlée.
3. Mesurer les résultats sur un jeu d'images/vidéos représentatif et publier une métrique avec protocole, limites et seuil de confiance.
4. Séparer plus clairement les simulations locales de l'interface des données de disponibilités provenant du backend.
5. Persister les préférences et le portefeuille seulement après définition d'un vrai besoin produit ; intégrer tout paiement via un fournisseur et un environnement de test adaptés.
6. Pour un pilote énergétique, connecter des équipements réels, définir les unités/fréquences de mesure et calibrer les estimations avant de publier des économies.

## Documents

- Rapport de compétition d'origine (PDF, conservé sans modification) : `RAPP Competition ver 2.pdf`
- Rapport final éditable : `RAPPORT_FINAL_ECOPARK.tex`
- Guide de lancement : `LAUNCH_README.md`
- Documentation frontend et architecture : `README.md`
