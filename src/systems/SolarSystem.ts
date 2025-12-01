import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { OrbitUtils } from '../physics/OrbitUtils';
import { ProceduralUtils } from './ProceduralUtils';

export class SolarSystem {
    static generate(): Body[] {
        const bodies: Body[] = [];

        // Visual Scale Factor for Physics
        // Since planets are visually 3x larger, we need to increase their mass by 3^2 = 9x
        // to maintain the same surface gravity at the visual surface.
        const VISUAL_PHYSICS_SCALE = 9.0;
        const VELOCITY_SCALE = Math.sqrt(VISUAL_PHYSICS_SCALE); // 3.0

        // Sun (Scaled Mass)
        const sun = new Body("Sun", 1.989e30 * VISUAL_PHYSICS_SCALE, 696340000, "#FFD700", new Vector2(0, 0), new Vector2(0, 0));
        sun.type = 'star';
        sun.atmosphereColor = "rgba(255, 215, 0, 0.4)";
        bodies.push(sun);

        // Planets (Approximate data)
        // Distance (m), Velocity (m/s), Mass (kg), Radius (m), Color
        const planets = [
            { name: "Mercury", dist: 57.9e9, vel: 47400, mass: 3.285e23, radius: 2439700, color: "#95A5A6", type: 'terrestrial' }, // Concrete Grey
            { name: "Venus", dist: 108.2e9, vel: 35000, mass: 4.867e24, radius: 6051800, color: "#F1C40F", type: 'terrestrial', atmosphere: "rgba(243, 156, 18, 0.4)" }, // Vibrant Yellow/Orange
            { name: "Earth", dist: 149.6e9, vel: 29780, mass: 5.972e24, radius: 6371000, color: "#3498DB", type: 'terrestrial', atmosphere: "rgba(52, 152, 219, 0.3)" }, // Bright Blue
            { name: "Mars", dist: 227.9e9, vel: 24070, mass: 6.39e23, radius: 3389500, color: "#E74C3C", type: 'terrestrial', atmosphere: "rgba(231, 76, 60, 0.2)" }, // Red
            { name: "Jupiter", dist: 778.5e9, vel: 13070, mass: 1.898e27, radius: 69911000, color: "#D35400", type: 'gas_giant' }, // Pumpkin Orange
            { name: "Saturn", dist: 1434e9, vel: 9680, mass: 5.683e26, radius: 58232000, color: "#F39C12", type: 'gas_giant', ringColor: "rgba(241, 196, 15, 0.6)", ringInner: 1.2, ringOuter: 2.3, atmosphere: "rgba(241, 196, 15, 0.2)" }, // Orange/Yellow
            { name: "Uranus", dist: 2871e9, vel: 6800, mass: 8.681e25, radius: 25362000, color: "#1ABC9C", type: 'gas_giant', ringColor: "rgba(26, 188, 156, 0.3)", ringInner: 1.5, ringOuter: 2.0 }, // Turquoise
            { name: "Neptune", dist: 4495e9, vel: 5430, mass: 1.024e26, radius: 24622000, color: "#2980B9", type: 'gas_giant', atmosphere: "rgba(41, 128, 185, 0.3)" }, // Strong Blue
            { name: "Pluto", dist: 5906e9, vel: 4743, mass: 1.309e22, radius: 1188300, color: "#BDC3C7", type: 'terrestrial' } // Silver
        ];

        planets.forEach(p => {
            // Start at random angle? For now, just x-axis
            const pos = new Vector2(p.dist, 0);

            // Scale velocity to match increased mass
            const vel = new Vector2(0, p.vel * VELOCITY_SCALE);

            // Apply mass scaling for "fun" physics that matches visuals
            const adjustedMass = p.mass * VISUAL_PHYSICS_SCALE;

            const planet = new Body(p.name, adjustedMass, p.radius, p.color, pos, vel);
            planet.type = p.type as any;
            if (p.atmosphere) planet.atmosphereColor = p.atmosphere;
            if (p.ringColor) {
                planet.ringColor = p.ringColor;
                planet.ringInnerRadius = p.radius * p.ringInner!;
                planet.ringOuterRadius = p.radius * p.ringOuter!;
            }

            planet.parent = sun;
            planet.orbit = OrbitUtils.calculateOrbit(planet, sun);
            bodies.push(planet);
        });

        // Venus Clouds
        const venus = bodies.find(b => b.name === "Venus")!;
        venus.clouds = ProceduralUtils.generateClouds(789, 30); // Thick clouds

        // Moon (Earth)
        const earth = bodies.find(b => b.name === "Earth")!;
        earth.clouds = ProceduralUtils.generateClouds(123, 20); // Generate 20 cloud blobs
        const moon = new Body("Moon", 7.347e22, 1737100, "#D3D3D3",
            earth.position.add(new Vector2(384400000, 0)),
            earth.velocity.add(new Vector2(0, 1022 * VELOCITY_SCALE)));
        moon.type = 'moon';
        moon.parent = earth;
        moon.orbit = OrbitUtils.calculateOrbit(moon, earth);
        moon.isLocked = true;
        moon.meanAnomaly = moon.orbit?.meanAnomaly0 || 0;
        moon.craters = ProceduralUtils.generateCraters(456, 15);
        bodies.push(moon);

        // Jupiter Moons (Galilean)
        const jupiter = bodies.find(b => b.name === "Jupiter")!;
        jupiter.hasStorms = true;
        const jupiterMoons = [
            { name: "Io", dist: 421700000, vel: 17334, mass: 8.93e22, radius: 1821600, color: "#FFFF00" },
            { name: "Europa", dist: 671034000, vel: 13740, mass: 4.8e22, radius: 1560800, color: "#F5F5DC" },
            { name: "Ganymede", dist: 1070412000, vel: 10880, mass: 1.48e23, radius: 2634100, color: "#D3D3D3" },
            { name: "Callisto", dist: 1882709000, vel: 8204, mass: 1.08e23, radius: 2410300, color: "#696969" }
        ];
        jupiterMoons.forEach(m => {
            const b = new Body(m.name, m.mass, m.radius, m.color,
                jupiter.position.add(new Vector2(m.dist, 0)),
                jupiter.velocity.add(new Vector2(0, m.vel * VELOCITY_SCALE)));
            b.type = 'moon';
            b.parent = jupiter;
            b.orbit = OrbitUtils.calculateOrbit(b, jupiter);
            b.isLocked = true;
            b.meanAnomaly = b.orbit?.meanAnomaly0 || 0;
            bodies.push(b);
        });

        // Saturn Moon (Titan)
        const saturn = bodies.find(b => b.name === "Saturn")!;
        const titan = new Body("Titan", 1.345e23, 2574700, "#F4A460",
            saturn.position.add(new Vector2(1221870000, 0)),
            saturn.velocity.add(new Vector2(0, 5570 * VELOCITY_SCALE)));
        titan.type = 'moon';
        titan.atmosphereColor = "rgba(218, 165, 32, 0.4)"; // Titan has thick atmosphere
        titan.parent = saturn;
        titan.orbit = OrbitUtils.calculateOrbit(titan, saturn);
        titan.isLocked = true;
        titan.meanAnomaly = titan.orbit?.meanAnomaly0 || 0;
        bodies.push(titan);

        // Neptune Moon (Triton) - Retrograde orbit!
        const neptune = bodies.find(b => b.name === "Neptune")!;
        const triton = new Body("Triton", 2.14e22, 1353400, "#FFC0CB",
            neptune.position.add(new Vector2(354759000, 0)),
            neptune.velocity.add(new Vector2(0, -4390 * VELOCITY_SCALE))); // Negative velocity for retrograde
        triton.type = 'moon';
        triton.parent = neptune;
        triton.orbit = OrbitUtils.calculateOrbit(triton, neptune);
        triton.isLocked = true;
        triton.meanAnomaly = triton.orbit?.meanAnomaly0 || 0;
        bodies.push(triton);

        // Mars Moons
        const mars = bodies.find(b => b.name === "Mars")!;
        const marsMoons = [
            { name: "Phobos", dist: 9376000, vel: 2138, mass: 1.0659e16, radius: 11266, color: "#8B4513" },
            { name: "Deimos", dist: 23463200, vel: 1351, mass: 1.4762e15, radius: 6200, color: "#A0522D" }
        ];
        marsMoons.forEach(m => {
            const b = new Body(m.name, m.mass, m.radius, m.color,
                mars.position.add(new Vector2(m.dist, 0)),
                mars.velocity.add(new Vector2(0, m.vel * VELOCITY_SCALE)));
            b.type = 'moon';
            b.parent = mars;
            b.orbit = OrbitUtils.calculateOrbit(b, mars);
            b.isLocked = true;
            b.meanAnomaly = b.orbit?.meanAnomaly0 || 0;
            bodies.push(b);
        });

        // Uranus Moons
        const uranus = bodies.find(b => b.name === "Uranus")!;
        const uranusMoons = [
            { name: "Titania", dist: 435910000, vel: 3645, mass: 3.527e21, radius: 788400, color: "#D3D3D3" },
            { name: "Oberon", dist: 583520000, vel: 3152, mass: 3.014e21, radius: 761400, color: "#A9A9A9" }
        ];
        uranusMoons.forEach(m => {
            const b = new Body(m.name, m.mass, m.radius, m.color,
                uranus.position.add(new Vector2(m.dist, 0)),
                uranus.velocity.add(new Vector2(0, m.vel * VELOCITY_SCALE)));
            b.type = 'moon';
            b.parent = uranus;
            b.orbit = OrbitUtils.calculateOrbit(b, uranus);
            b.isLocked = true;
            b.meanAnomaly = b.orbit?.meanAnomaly0 || 0;
            bodies.push(b);
        });

        // Pluto Moon (Charon)
        const pluto = bodies.find(b => b.name === "Pluto")!;
        const charon = new Body("Charon", 1.586e21, 606000, "#808080",
            pluto.position.add(new Vector2(19591000, 0)),
            pluto.velocity.add(new Vector2(0, 210 * VELOCITY_SCALE)));
        charon.type = 'moon';
        charon.parent = pluto;
        charon.orbit = OrbitUtils.calculateOrbit(charon, pluto);
        charon.isLocked = true;
        charon.meanAnomaly = charon.orbit?.meanAnomaly0 || 0;
        bodies.push(charon);

        // Add craters to other moons randomly
        bodies.forEach(b => {
            if (b.type === 'moon' && b.name !== "Moon") {
                // Use name length as seed for variety
                b.craters = ProceduralUtils.generateCraters(b.name.length * 100, 8);
            }
        });

        return bodies;
    }
}
