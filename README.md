# 🚀 Lolo Space Program

Un simulateur de vol spatial 2D inspiré de Kerbal Space Program, développé avec TypeScript et Three.js. Explorez le système solaire, gérez vos réacteurs, et naviguez dans les sphères d'influence gravitationnelles.

## ✨ Fonctionnalités

- **Système Solaire Réaliste** : Soleil, planètes et lunes avec orbites correctes
- **Physique Gravitationnelle** : Simulation N-corps avec détection dynamique de la sphère d'influence (SOI)
- **Contrôle de Fusée** : Rotation, poussée réglable, et gestion du carburant
- **Trajectoires Orbitales** : Visualisation des orbites elliptiques dynamiques
- **Rendu 3D** : Graphics avec Three.js, textures procédurales des planètes
- **Contrôle du Temps** : Accélération temporelle pour les longs voyages
- **Interface HUD** : Télémétrie complète (carburant, vitesse, altitude, gravité)
- **Minimap** : Vue d'ensemble du système solaire

## 🎮 Contrôles

### Fusée
- **Z / Flèche Haut** : Poussée pleine puissance
- **S / Flèche Bas** : Couper les moteurs
- **Q / Flèche Gauche** : Rotation gauche
- **D / Flèche Droite** : Rotation droite
- **Shift** : Augmenter progressivement la poussée
- **Ctrl** : Diminuer progressivement la poussée
- **Slider Throttle** : Contrôle précis de la poussée via l'interface

### Caméra
- **Molette de la souris** : Zoom avant/arrière
- **Clic + Glisser** : Déplacer la caméra (désactive le suivi)
- **Bouton "Focus Rocket"** : Centrer la caméra sur la fusée
- **Dropdown de sélection** : Suivre un corps céleste spécifique

### Temps
- **<< / >>** : Diminuer/Augmenter l'accélération temporelle
- **||** : Pause
- **>** : Vitesse normale (1x)

### Debug
- **Infinite Fuel** : Carburant illimité pour les tests
- **Show Trajectory** : Afficher la trajectoire orbitale prédite

## 🛠️ Installation

```bash
# Cloner le repository
git clone <url-du-repo>
cd loloSpaceProgram

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le jeu sera disponible sur `http://localhost:5173` (ou le prochain port disponible).

## 🏗️ Build

```bash
# Créer une version de production
npm run build

# Prévisualiser la version de production
npm run preview
```

## 🌌 Caractéristiques Techniques

### Technologies
- **TypeScript** : Typage statique et meilleure maintenabilité
- **Three.js** : Rendu 3D/2D pour les graphiques
- **Vite** : Build tool moderne et rapide
- **Matter.js** : Détection de collisions

### Systèmes Physiques
- **Gravitation N-corps** : Calcul des forces gravitationnelles entre tous les corps
- **Sphère d'Influence (SOI)** : Détection automatique du corps dominant pour les trajectoires
- **Orbites Keplériennes** : Calcul analytique des ellipses orbitales
- **Intégration Euler Symplectique** : Stabilité numérique de la simulation
- **Gestion des Collisions** : Atterrissages souples et crashs

### Architecture
```
src/
├── core/          # Classes de base (Body, Vector2)
├── entities/      # Fusée, moteur, contrôles
├── physics/       # Physique, orbites, collisions, SOI
├── rendering/     # Rendu Three.js, textures, orbites
├── systems/       # Génération du système solaire
├── ui/            # Interface utilisateur
└── Game.ts        # Boucle de jeu principale
```

## 🎯 Prochaines Étapes

- [ ] Manœuvres de transfert de Hohmann
- [ ] Système de staging (étages multiples)
- [ ] Sauvegarde/Chargement de missions
- [ ] Autres corps célestes (astéroïdes, comètes)
- [ ] Sons et effets visuels améliorés

## 📝 License

© 2025 Laurent Spitz. All rights reserved.
Source code is available for educational purposes only. Unauthorized copying, modification, distribution, or commercial use is strictly prohibited.

## 🙏 Remerciements

Inspiré par [Kerbal Space Program](https://www.kerbalspaceprogram.com/)
