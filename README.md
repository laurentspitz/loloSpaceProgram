# 🚀 Ærospace Industries

### A Flat Spaceflight Simulation

> **“The Universe Is Flat. The Learning Curve Isn’t.”**

## 🎮 About the Game

**Ærospace Industries** is a 2D spaceflight simulation inspired by real orbital mechanics.

Design experimental spacecraft, manage thrust and trajectories, and learn to master gravity inside a simplified yet physically accurate flat solar system. Every launch is a test, every crash a valuable data point.

Built in a two-dimensional universe where physics still matters, Ærospace Industries challenges players to reach orbit, land on the Moon, and explore space through experimentation, iteration, and failure.

Developed entirely with the help of artificial intelligence, the game embraces learning through simulation and controlled chaos.

## 🧠 Lore

**Ærospace Industries** is an experimental aerospace organization dedicated to simulation-based spaceflight research.

After years of costly failures and destroyed prototypes, the company abandoned traditional engineering workflows and entrusted spacecraft design, testing, and mission planning to artificial intelligence.

The result is a flat, controlled simulation environment where AI-generated concepts can be launched, analyzed, improved — and frequently lost to gravity.

The universe may be flat.
The physics are not.

---

## ✨ Features

- **Realistic Solar System**: Sun, planets, and moons with correct orbits
- **Gravitational Physics**: N-body simulation with dynamic Sphere of Influence (SOI) detection
- **Rocket Control**: Rotation, adjustable thrust, and fuel management
- **Orbital Trajectories**: Visualization of dynamic elliptical orbits
- **3D Rendering**: Graphics with Three.js, procedural planet textures
- **Time Control**: Time acceleration for long voyages
- **HUD Interface**: Full telemetry (fuel, speed, altitude, gravity)
- **Minimap**: Overview of the solar system

## 🎮 Controls

### Rocket
- **W / Up Arrow**: Full thrust
- **S / Down Arrow**: Cut engines
- **A / Left Arrow**: Rotate left
- **D / Right Arrow**: Rotate right
- **Shift**: Gradually increase thrust
- **Ctrl**: Gradually decrease thrust
- **Throttle Slider**: Precise thrust control via interface

### Camera
- **Mouse Wheel**: Zoom in/out
- **Click + Drag**: Move camera (disables tracking)
- **"Focus Rocket" Button**: Center camera on rocket
- **Selection Dropdown**: Follow specific celestial body

### Time
- **<< / >>**: Decrease/Increase time acceleration
- **||**: Pause
- **>** : Normal speed (1x)

### Debug
- **Infinite Fuel**: Unlimited fuel for testing
- **Show Trajectory**: Show predicted orbital trajectory

## 🛠️ Installation

```bash
# Clone the repository
git clone <repo-url>
cd aerospace-industries

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173` (or the next available port).

## 🏗️ Build

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 🌌 Technical Characteristics

### Technologies
- **TypeScript**: Static typing and better maintainability
- **Vite**: Modern and fast build tool
- **Matter.js**: Collision detection

### Architecture
```
src/
├── core/          # Base classes (Body, Vector2)
├── entities/      # Rocket, engine, controls
├── physics/       # Physics, orbits, collisions, SOI
├── rendering/     # Three.js rendering, textures, orbits
├── systems/       # Solar system generation
├── ui/            # User interface
└── Game.ts        # Main game loop
```

## 🎯 Next Steps

- [ ] Hohmann transfer maneuvers
- [ ] Staging system (multiple stages)
- [ ] Mission Save/Load
- [ ] Other celestial bodies (asteroids, comets)
- [ ] Improved sounds and visual effects

## 📝 License

© 2025 Laurent Spitz. All rights reserved.
Source code is available for educational purposes only. Unauthorized copying, modification, distribution, or commercial use is strictly prohibited.

## 🙏 Acknowledgements

Inspired by [Kerbal Space Program](https://www.kerbalspaceprogram.com/)
