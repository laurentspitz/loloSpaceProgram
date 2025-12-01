import { Body } from './core/Body';
import { Rocket } from './entities/Rocket';
import { SolarSystem } from './systems/SolarSystem';
import { Vector2 } from './core/Vector2';
import { CollisionManager } from './physics/CollisionManager';

/**
 * SceneSetup - Handles initialization of the game scene
 */
export class SceneSetup {
    static initBodies(collisionManager: CollisionManager): Body[] {
        const bodies = SolarSystem.generate();

        // Create Matter.js bodies for all celestial bodies
        bodies.forEach(body => {
            collisionManager.createCelestialBody(body, 3.0); // Visual scale = 3.0
        });

        return bodies;
    }

    static createRocket(bodies: Body[], collisionManager: CollisionManager): Rocket {
        // Create rocket in low Earth orbit
        const earth = bodies.find(b => b.name === 'Earth')!;

        // IMPORTANT: Planets are rendered with visualScale = 3.0
        // So visual radius = earth.radius * 3.0
        // We need to orbit outside the VISUAL radius, not just the physical radius
        const visualRadius = earth.radius * 3.0; // Account for visual scaling
        const orbitAltitude = earth.radius * 0.5; // 50% of Earth radius above surface (~3000km)
        const orbitRadius = visualRadius + orbitAltitude;

        // Position: start above Earth (angle PI/2) to be visible
        const angle = Math.PI / 2; // Top of Earth
        const rocketPos = earth.position.add(new Vector2(
            Math.cos(angle) * orbitRadius,
            Math.sin(angle) * orbitRadius
        ));

        // Calculate orbital velocity for circular orbit: v = sqrt(GM/r)
        // Earth's mass is already scaled by 9x for visual physics
        const orbitalSpeed = Math.sqrt((6.674e-11 * earth.mass) / orbitRadius);

        // Velocity perpendicular to radius for circular orbit
        // angle = PI/2 (top of Earth), so perpendicular is to the left (-x direction)
        const rocketVel = earth.velocity.add(new Vector2(
            -Math.sin(angle) * orbitalSpeed,  // Perpendicular to radius
            Math.cos(angle) * orbitalSpeed
        ));

        const rocket = new Rocket(rocketPos, rocketVel);

        // CRITICAL: Add rocket body to physics simulation!
        bodies.push(rocket.body);

        // Create Matter.js body for rocket
        collisionManager.createRocketBody(rocket);

        return rocket;
    }
}
