import { Body } from './core/Body';
import { Rocket } from './entities/Rocket';
import { SystemGenerator } from './systems/SystemGenerator';
import { SolarSystemData } from './systems/data/SolarSystemData';
import { AlphaCentauriData } from './systems/data/AlphaCentauriData';
import { Vector2 } from './core/Vector2';
import { CollisionManager } from './physics/CollisionManager';

/**
 * Launch configuration passed from launch pad
 */
export interface LaunchConfig {
    longitude: number;  // Earth texture rotation (degrees, real world longitude)
    latitude: number;   // Rocket tilt (degrees, 0 = equator, positive = north)
}

/**
 * SceneSetup - Handles initialization of the game scene
 */
export class SceneSetup {
    static initBodies(collisionManager: CollisionManager): Body[] {
        let bodies: Body[] = [];

        // Load Solar System
        bodies = bodies.concat(SystemGenerator.generate(SolarSystemData));

        // Load Alpha Centauri
        bodies = bodies.concat(SystemGenerator.generate(AlphaCentauriData));

        // Create Matter.js bodies for all celestial bodies
        bodies.forEach(body => {
            collisionManager.createCelestialBody(body, 1.0); // No visual scaling
        });

        return bodies;
    }

    static createRocket(
        bodies: Body[],
        collisionManager: CollisionManager,
        assemblyConfig?: any,
        launchConfig?: LaunchConfig
    ): Rocket {
        // Create rocket on Earth's surface
        const earth = bodies.find(b => b.name === 'Earth')!;

        // Planets are rendered at their real radius (no visual scaling)
        const visualRadius = earth.radius;

        // Rocket position based on latitude
        // 0° latitude = equator = right side of planet (positive X axis)
        // 46°N = 46° angle from horizontal, towards top
        // -46°S = 46° angle towards bottom
        const latitude = launchConfig?.latitude || 0;
        const latitudeRad = (latitude * Math.PI) / 180;

        // In 2D view: angle 0 = right (equator), positive angle = counterclockwise (north)
        const launchAngleRad = latitudeRad;

        // Position: On surface at launch angle, slightly above to avoid initial collision
        const surfaceOffset = 10; // 10 meters above surface
        const rocketPos = earth.position.add(new Vector2(
            Math.cos(launchAngleRad) * (visualRadius + surfaceOffset),
            Math.sin(launchAngleRad) * (visualRadius + surfaceOffset)
        ));

        // Velocity: Earth's rotation at launch latitude
        // At equator (0° lat): ~460 m/s
        // At higher latitudes: cos(lat) * 460 m/s
        const rotationalSpeed = 460 * Math.cos(latitudeRad); // Reduced at higher latitudes

        // Velocity is tangential (perpendicular to radial direction)
        const rocketVel = earth.velocity.add(new Vector2(
            -Math.sin(launchAngleRad) * rotationalSpeed,
            Math.cos(launchAngleRad) * rotationalSpeed
        ));

        const rocket = new Rocket(rocketPos, rocketVel, assemblyConfig);

        // Rocket orientation: perpendicular to surface (pointing radially outward)
        // Matches the launch angle so rocket points "up" relative to surface
        rocket.rotation = launchAngleRad;

        // Add rocket body to physics simulation
        bodies.push(rocket.body);

        // Create Matter.js body for rocket
        collisionManager.createRocketBody(rocket);

        return rocket;
    }
}
