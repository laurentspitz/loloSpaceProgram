import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { OrbitUtils } from '../physics/OrbitUtils';
import { ProceduralUtils } from './ProceduralUtils';
import type { StarSystemConfig, CelestialBodyConfig } from './SystemConfig';

export class SystemGenerator {
    static generate(config: StarSystemConfig): Body[] {
        const bodies: Body[] = [];

        // Visual Scale Factor for Physics - now 1.0 since we removed visual scaling
        // Previously was 9.0 to compensate for 3x visual radius (gravity = M/r² → 9M/(3r)² = M/r²)
        const VISUAL_PHYSICS_SCALE = 1.0;
        const VELOCITY_SCALE = Math.sqrt(VISUAL_PHYSICS_SCALE); // 1.0

        // Helper function to recursively create bodies
        const createBody = (bodyConfig: CelestialBodyConfig, parent: Body | null, systemPos: Vector2): Body => {
            // Apply mass scaling
            const adjustedMass = bodyConfig.mass * VISUAL_PHYSICS_SCALE;

            // Calculate absolute position
            // If it has a parent, position is relative to parent
            // If it's a root (star), position is relative to system center (usually 0,0)
            let pos: Vector2;
            let vel: Vector2;

            if (parent) {
                // Position relative to parent
                pos = parent.position.add(new Vector2(bodyConfig.distanceFromParent, 0));

                // Velocity relative to parent (if not specified, calc circular?)
                // The config has initialVelocity. If it's defined, use it (scaled).
                // If config has specific velocity, use that.
                // Note: Original code had specific Logic for Triton being retrograde.
                // We should assume the config velocity is the tangential speed.

                const velocityMag = (bodyConfig.initialVelocity || 0) * VELOCITY_SCALE;
                vel = parent.velocity.add(new Vector2(0, velocityMag));

                // Handle Retrograde if needed (Triton was negative in config)
                // The config for Triton in my data file has negative velocity, so this add works fine.
            } else {
                // Root body
                pos = systemPos.add(new Vector2(bodyConfig.distanceFromParent, 0));
                vel = config.velocity.clone();
            }

            const body = new Body(
                bodyConfig.name,
                adjustedMass,
                bodyConfig.radius,
                bodyConfig.color,
                pos,
                vel
            );

            body.type = bodyConfig.type;
            body.atmosphereColor = bodyConfig.atmosphereColor;
            body.atmosphereOpacity = bodyConfig.atmosphereOpacity;
            body.atmosphereRadiusScale = bodyConfig.atmosphereRadiusScale;

            // Physics props
            body.atmosphereDensity = bodyConfig.atmosphereDensity;
            body.atmosphereHeight = bodyConfig.atmosphereHeight;
            body.atmosphereFalloff = bodyConfig.atmosphereFalloff;

            body.description = bodyConfig.description;

            // Parent/Child relationship
            if (parent) {
                body.parent = parent;
                body.orbit = OrbitUtils.calculateOrbit(body, parent);
                // Lock tidal forces for moons usually
                if (body.type === 'moon') {
                    body.isLocked = true;
                }
                body.meanAnomaly = body.orbit?.meanAnomaly0 || 0;

                // Add to parent's children list
                parent.children.push(body);
            }

            // Copy modular features from config
            // Features replace legacy properties (hasStorms, ringColor, etc.)
            body.features = bodyConfig.features || [];

            // Craters
            // Original logic: "Add craters to other moons randomly... if type === moon and name !== Moon"
            // Also logic for original "Moon": generateCraters(456, 15)
            if (body.name === "Moon") {
                body.craters = ProceduralUtils.generateCraters(456, 15);
            } else if (body.type === 'moon' || body.name === 'Mercury') { // Mercury is cratered too usually
                // Use name length as seed
                body.craters = ProceduralUtils.generateCraters(body.name.length * 100, 8);
            }

            bodies.push(body);

            // Recursively create satellites
            if (bodyConfig.satellites) {
                bodyConfig.satellites.forEach(satConfig => {
                    createBody(satConfig, body, systemPos);
                });
            }

            return body;
        };

        // Generate roots
        config.rootBodies.forEach(rootConfig => {
            createBody(rootConfig, null, config.position);
        });

        return bodies;
    }
}
