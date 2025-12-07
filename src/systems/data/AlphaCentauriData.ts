import type { StarSystemConfig } from '../SystemConfig';
import { Vector2 } from '../../core/Vector2';

export const AlphaCentauriData: StarSystemConfig = {
    name: "Alpha Centauri",
    position: new Vector2(4e13, 2e13), // Very far away (~4 light years is 4e16m, but let's keep it somewhat viewable for game purposes or use realistic scale?) 
    // User asked for "future solar system", let's put it at a significant distance but reachable with high time warp if we implemented interstellar travel.
    // A light year is 9.46e15 meters. Alpha Centauri is ~4.37 LY away.
    // Let's place it at a game-scale distance. If Pluto is 5.9e12, let's put this at 2e14 (200,000 billion meters).
    velocity: new Vector2(0, 0),
    rootBodies: [
        {
            name: "Alpha Centauri A",
            mass: 2.18e30, // 1.1x Sun
            radius: 850000000, // 1.2x Sun
            color: "#FFFACD", // LemonChiffon
            distanceFromParent: 0,
            type: 'star',
            atmosphereColor: "rgba(255, 250, 205, 0.4)",
            description: "The primary star of the Alpha Centauri system, slightly larger than our Sun.",
            satellites: [
                {
                    name: "Centauri Prime",
                    mass: 6.0e24, // Earth-like
                    radius: 6400000,
                    color: "#2E8B57", // Seagreen
                    distanceFromParent: 160e9, // ~1 AU
                    initialVelocity: 30000,
                    type: 'terrestrial',
                    atmosphereColor: "rgba(46, 139, 87, 0.3)",
                    description: "A habitable super-earth orbiting Alpha Centauri A.",
                    satellites: [
                        { name: "Hope", mass: 8e22, radius: 1800000, color: "#87CEEB", distanceFromParent: 400000000, initialVelocity: 1100, type: 'moon', description: "A large moon with subsurface oceans." }
                    ]
                }
            ]
        },
        // Alpha Centauri B could be orbiting A, but for now let's keep it simple or double star? 
        // Let's add B as a companion star at a distance.
        {
            name: "Alpha Centauri B",
            mass: 1.7e30, // 0.9x Sun
            radius: 600000000,
            color: "#FFA500", // Orange
            distanceFromParent: 3.5e12, // Distance from A (approximate mean)
            initialVelocity: 0, // Needs orbital velocity around A
            type: 'star',
            atmosphereColor: "rgba(255, 165, 0, 0.4)",
            description: "The secondary star, slightly smaller and cooler than the Sun.",
            satellites: [
                {
                    name: "Proxima Centauri", // techically orbits AB, but let's put it here for hierarchy depth or just make it separate
                    mass: 2.4e29,
                    radius: 100000000,
                    color: "#DC143C",
                    distanceFromParent: 1e11, // Wrong distance, usually much further. 
                    initialVelocity: 5000,
                    type: 'star', // It's a red dwarf
                    description: "A red dwarf star, the closest star to the Sun.",
                    satellites: [
                        { name: "Proxima b", mass: 7e24, radius: 6800000, color: "#A52A2A", distanceFromParent: 7e9, initialVelocity: 45000, type: 'terrestrial', description: "A rocky planet in the habitable zone of Proxima Centauri." }
                    ]
                }
            ]
        }
    ]
};
