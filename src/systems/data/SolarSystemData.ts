import type { StarSystemConfig } from '../SystemConfig';
import type { CloudFeature, RingFeature, StormFeature, SurfaceFeature, ContinentFeature, IceCapFeature } from '../CelestialBodyFeatures';
import { Vector2 } from '../../core/Vector2';

export const SolarSystemData: StarSystemConfig = {
    name: "Solar System",
    position: new Vector2(0, 0),
    velocity: new Vector2(0, 0),
    rootBodies: [
        {
            name: "Sun",
            mass: 1.989e30,
            radius: 696340000,
            color: "#FFD700",
            distanceFromParent: 0,
            type: 'star',
            atmosphereColor: "rgba(255, 215, 0, 0.4)",
            description: "celestial.sun.description",
            satellites: [
                {
                    name: "Mercury",
                    mass: 3.285e23,
                    radius: 2439700,
                    color: "#95A5A6",
                    distanceFromParent: 57.9e9,
                    initialVelocity: 47400,
                    type: 'terrestrial',
                    description: "celestial.mercury.description",
                    satellites: []
                },
                {
                    name: "Venus",
                    mass: 4.867e24,
                    radius: 6051800,
                    color: "#F1C40F",
                    distanceFromParent: 108.2e9,
                    initialVelocity: 35000,
                    type: 'terrestrial',
                    atmosphereColor: "rgba(243, 156, 18, 0.4)",
                    atmosphereOpacity: 0.6,
                    atmosphereRadiusScale: 1.3,
                    atmosphereDensity: 65.0,
                    atmosphereHeight: 250000,
                    atmosphereFalloff: 15900,
                    description: "celestial.venus.description",
                    satellites: [],
                    features: [
                        {
                            type: 'surface',
                            style: 'rocky',
                            primaryColor: '#fff4a3',
                            secondaryColor: '#F1C40F',
                            tertiaryColor: '#c9a00c'
                        } as SurfaceFeature,
                        {
                            type: 'clouds',
                            surfaceClouds: true,
                            atmosphericClouds: true,
                            altitudeMin: 1000,
                            altitudeMax: 200000,
                            color: 'rgba(243, 200, 100, 0.4)',
                            opacity: 0.6
                        } as CloudFeature
                    ]
                },
                {
                    name: "Earth",
                    mass: 5.972e24,
                    radius: 6371000,
                    color: "#3498DB",
                    distanceFromParent: 149.6e9,
                    initialVelocity: 29780,
                    type: 'terrestrial',
                    atmosphereColor: "rgba(100, 180, 255, 0.0)",
                    atmosphereOpacity: 0.25,
                    atmosphereRadiusScale: 1.15,
                    atmosphereDensity: 5.0, // Increased from 1.225 for game feel
                    // ARCADE PHYSICS TUNING:
                    // Authentically, atmosphere ends at ~100-160km.
                    // But visually (halo) it extends much further due to 3x planet scale.
                    // User expects drag at 1000km visual altitude.
                    atmosphereHeight: 1000000, // 1000 km height (was 160km)
                    atmosphereFalloff: 100000, // 100 km scale height (was 8km) to ensure density at 1000km
                    description: "celestial.earth.description",
                    satellites: [
                        {
                            name: "Moon",
                            mass: 7.347e22,
                            radius: 1737100,
                            color: "#D3D3D3",
                            distanceFromParent: 384400000,
                            initialVelocity: 1022,
                            type: 'moon',
                            description: "celestial.moon.description",
                        }
                    ],
                    features: [
                        {
                            type: 'surface',
                            style: 'ocean',
                            primaryColor: '#4da6ff',
                            secondaryColor: '#0066cc',
                            tertiaryColor: '#004080'
                        } as SurfaceFeature,
                        {
                            type: 'continents',
                            color: '#228B22',  // Forest green for land
                            svgUrl: 'earth',   // Identifier for preloaded SVG (loaded in App.ts)
                            longitudeOffset: 0  // 0 = default view, adjust for different launch sites
                        } as ContinentFeature,
                        {
                            type: 'ice_caps',
                            northPole: true,
                            southPole: true,
                            size: 0.08,
                            opacity: 1.0
                        } as IceCapFeature,
                        {
                            type: 'clouds',
                            surfaceClouds: true,
                            atmosphericClouds: true,
                            altitudeMin: 1000,
                            altitudeMax: 80000,
                            color: 'rgba(255, 255, 255, 0.5)',
                            opacity: 0.5
                        } as CloudFeature
                    ]
                },
                {
                    name: "Mars",
                    mass: 6.39e23,
                    radius: 3389500,
                    color: "#E74C3C",
                    distanceFromParent: 227.9e9,
                    initialVelocity: 24070,
                    type: 'terrestrial',
                    atmosphereColor: "rgba(255, 69, 0, 0.4)", // Red-Orange, more visible
                    atmosphereOpacity: 0.5,
                    atmosphereRadiusScale: 1.1,
                    atmosphereDensity: 0.02,
                    atmosphereHeight: 50000,
                    atmosphereFalloff: 11000,
                    description: "celestial.mars.description",
                    satellites: [
                        { name: "Phobos", mass: 1.0659e16, radius: 11266, color: "#8B4513", distanceFromParent: 9376000, initialVelocity: 2138, type: 'moon', description: "celestial.phobos.description" },
                        { name: "Deimos", mass: 1.4762e15, radius: 6200, color: "#A0522D", distanceFromParent: 23463200, initialVelocity: 1351, type: 'moon', description: "celestial.deimos.description" }
                    ],
                    features: [
                        {
                            type: 'surface',
                            style: 'rocky',
                            primaryColor: '#ff6b4a',
                            secondaryColor: '#E74C3C',
                            tertiaryColor: '#a83226'
                        } as SurfaceFeature,
                        {
                            type: 'ice_caps',
                            northPole: true,
                            southPole: true,
                            size: 0.12,
                            opacity: 0.8
                        } as IceCapFeature
                    ]
                },
                {
                    name: "Jupiter",
                    mass: 1.898e27,
                    radius: 69911000,
                    color: "#D35400",
                    distanceFromParent: 778.5e9,
                    initialVelocity: 13070,
                    type: 'gas_giant',
                    description: "celestial.jupiter.description",
                    satellites: [
                        { name: "Io", mass: 8.93e22, radius: 1821600, color: "#FFFF00", distanceFromParent: 421700000, initialVelocity: 17334, type: 'moon', description: "celestial.io.description" },
                        { name: "Europa", mass: 4.8e22, radius: 1560800, color: "#F5F5DC", distanceFromParent: 671034000, initialVelocity: 13740, type: 'moon', description: "celestial.europa.description" },
                        { name: "Ganymede", mass: 1.48e23, radius: 2634100, color: "#D3D3D3", distanceFromParent: 1070412000, initialVelocity: 10880, type: 'moon', description: "celestial.ganymede.description" },
                        { name: "Callisto", mass: 1.08e23, radius: 2410300, color: "#696969", distanceFromParent: 1882709000, initialVelocity: 8204, type: 'moon', description: "celestial.callisto.description" }
                    ],
                    features: [
                        {
                            type: 'storms',
                            hasGreatSpot: true
                        } as StormFeature
                    ]
                },
                {
                    name: "Saturn",
                    mass: 5.683e26,
                    radius: 58232000,
                    color: "#F39C12",
                    distanceFromParent: 1434e9,
                    initialVelocity: 9680,
                    type: 'gas_giant',
                    atmosphereColor: "rgba(241, 196, 15, 0.2)",
                    description: "celestial.saturn.description",
                    satellites: [
                        {
                            name: "Titan",
                            mass: 1.345e23,
                            radius: 2574700,
                            color: "#F4A460",
                            distanceFromParent: 1221870000,
                            initialVelocity: 5570,
                            type: 'moon',
                            atmosphereColor: "rgba(218, 165, 32, 0.4)",
                            atmosphereOpacity: 0.4,
                            atmosphereRadiusScale: 1.4,
                            atmosphereDensity: 5.0,
                            atmosphereHeight: 600000,
                            atmosphereFalloff: 40000,
                            description: "celestial.titan.description"
                        }
                    ],
                    features: [
                        {
                            type: 'rings',
                            innerRadius: 1.2,
                            outerRadius: 2.3,
                            color: 'rgba(241, 196, 15, 0.6)'
                        } as RingFeature
                    ]
                },
                {
                    name: "Uranus",
                    mass: 8.681e25,
                    radius: 25362000,
                    color: "#1ABC9C",
                    distanceFromParent: 2871e9,
                    initialVelocity: 6800,
                    type: 'gas_giant',
                    description: "celestial.uranus.description",
                    satellites: [
                        { name: "Titania", mass: 3.527e21, radius: 788400, color: "#D3D3D3", distanceFromParent: 435910000, initialVelocity: 3645, type: 'moon', description: "celestial.titania.description" },
                        { name: "Oberon", mass: 3.014e21, radius: 761400, color: "#A9A9A9", distanceFromParent: 583520000, initialVelocity: 3152, type: 'moon', description: "celestial.oberon.description" }
                    ],
                    features: [
                        {
                            type: 'rings',
                            innerRadius: 1.5,
                            outerRadius: 2.0,
                            color: 'rgba(26, 188, 156, 0.3)'
                        } as RingFeature
                    ]
                },
                {
                    name: "Neptune",
                    mass: 1.024e26,
                    radius: 24622000,
                    color: "#2980B9",
                    distanceFromParent: 4495e9,
                    initialVelocity: 5430,
                    type: 'gas_giant',
                    atmosphereColor: "rgba(41, 128, 185, 0.3)",
                    description: "celestial.neptune.description",
                    satellites: [
                        { name: "Triton", mass: 2.14e22, radius: 1353400, color: "#FFC0CB", distanceFromParent: 354759000, initialVelocity: -4390, type: 'moon', description: "celestial.triton.description" }
                    ]
                },
                {
                    name: "Pluto",
                    mass: 1.309e22,
                    radius: 1188300,
                    color: "#BDC3C7",
                    distanceFromParent: 5906e9,
                    initialVelocity: 4743,
                    type: 'terrestrial',
                    description: "celestial.pluto.description",
                    satellites: [
                        { name: "Charon", mass: 1.586e21, radius: 606000, color: "#808080", distanceFromParent: 19591000, initialVelocity: 210, type: 'moon', description: "celestial.charon.description" }
                    ]
                }
            ]
        }
    ]
};
