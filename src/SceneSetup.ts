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

    static createRocket(bodies: Body[], collisionManager: CollisionManager, assemblyConfig?: any): Rocket {
        // Create rocket on Earth's surface
        const earth = bodies.find(b => b.name === 'Earth')!;

        // IMPORTANT: Planets are rendered with visualScale = 3.0
        const visualRadius = earth.radius * 3.0;

        // Position: On surface, slightly above to avoid initial collision
        const launchAngle = Math.PI / 2; // Top of Earth (90 degrees)
        const surfaceOffset = 10; // 10 meters above surface
        const rocketPos = earth.position.add(new Vector2(
            Math.cos(launchAngle) * (visualRadius + surfaceOffset),
            Math.sin(launchAngle) * (visualRadius + surfaceOffset)
        ));

        // Velocity: Earth's rotation at equator (~460 m/s eastward)
        // At launchAngle = PI/2 (top), eastward is to the left (-x direction)
        const rotationalSpeed = 460; // m/s
        const rocketVel = earth.velocity.add(new Vector2(
            -rotationalSpeed, // Eastward at top of Earth
            0
        ));

        const rocket = new Rocket(rocketPos, rocketVel, assemblyConfig);

        // Add rocket body to physics simulation
        bodies.push(rocket.body);

        // Create Matter.js body for rocket
        collisionManager.createRocketBody(rocket);

        return rocket;
    }
}
