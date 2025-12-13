import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';

/**
 * Part interface for aerodynamics calculations
 */
interface AeroPart {
    definition: {
        type: string;
        stats: {
            dragReduction?: number;
            [key: string]: any;
        };
        [key: string]: any;
    };
    deployed?: boolean;
    [key: string]: any;
}

/**
 * Rocket data interface for aerodynamics calculations
 */
export interface AeroRocketData {
    body: Body;
    width: number;
    rotation: number;
    angularVelocity: number;
    momentOfInertia: number;
    centerOfMass: Vector2;
    partStack?: AeroPart[];
    getTotalHeight(): number;
}

/**
 * AerodynamicsSystem - Handles atmospheric drag and aerodynamic torque
 * Extracted from Rocket.ts for maintainability
 */
export class AerodynamicsSystem {
    private static readonly PLANET_SCALE = 3.0; // Must match SceneSetup.ts
    private static readonly DRAG_MULTIPLIER = 20.0; // Gameplay feel boost

    /**
     * Apply atmospheric drag to the rocket
     * Modifies rocket body velocity and angular velocity directly
     */
    applyDrag(rocket: AeroRocketData, dt: number, bodies: Body[]): void {
        // Find nearest body with atmosphere
        const { nearestBody, minDist } = this.findNearestAtmosphericBody(rocket.body.position, bodies);
        if (!nearestBody) return;

        // Calculate altitude
        const visualRadius = nearestBody.radius * AerodynamicsSystem.PLANET_SCALE;
        const altitude = minDist - visualRadius;

        if (altitude < 0) return; // Underground

        // Get atmospheric density
        const rho = nearestBody.getAtmosphericDensity(altitude);
        if (rho <= 0.000001) {
            if (altitude < (nearestBody.atmosphereHeight || 0) && Math.random() < 0.01) {
                // Debug log removed
            }
            return;
        }

        // Calculate relative velocity
        const relVel = rocket.body.velocity.sub(nearestBody.velocity);
        const speed = relVel.mag();
        if (speed < 0.1) return;

        // Calculate drag force
        const { Cd, area, isParachuteDeployed } = this.calculateDragCoefficients(rocket);
        const dragMag = 0.5 * rho * speed * speed * Cd * area * AerodynamicsSystem.DRAG_MULTIPLIER;

        // Direction is opposite to relative velocity
        const dragDir = relVel.normalize().scale(-1);
        const dragForce = dragDir.scale(dragMag);

        // Apply drag acceleration to velocity
        const dragAccel = dragForce.scale(1 / rocket.body.mass);
        rocket.body.velocity.addInPlace(dragAccel.scale(dt));

        // Apply aerodynamic torque (pendulum effect) if parachute is deployed
        if (isParachuteDeployed) {
            this.applyAeroTorque(rocket, dragForce, dt);
        }
    }

    /**
     * Find the nearest celestial body with an atmosphere
     */
    private findNearestAtmosphericBody(position: Vector2, bodies: Body[]): { nearestBody: Body | null; minDist: number } {
        let nearestBody: Body | null = null;
        let minDist = Infinity;

        for (const body of bodies) {
            if (!body.atmosphereHeight) continue;

            const dist = position.distanceTo(body.position);
            const visualRadius = body.radius * AerodynamicsSystem.PLANET_SCALE;

            // Check if within atmosphere + visual radius
            if (dist < visualRadius + body.atmosphereHeight) {
                if (dist < minDist) {
                    minDist = dist;
                    nearestBody = body;
                }
            }
        }

        return { nearestBody, minDist };
    }

    /**
     * Calculate drag coefficient and cross-sectional area based on rocket state
     */
    private calculateDragCoefficients(rocket: AeroRocketData): { Cd: number; area: number; isParachuteDeployed: boolean } {
        let Cd = 0.2; // Streamlined rocket default
        let area = Math.PI * (rocket.width / 2) * (rocket.width / 2); // Cross section
        let isParachuteDeployed = false;

        if (rocket.partStack) {
            let totalDragReduction = 0;

            for (const part of rocket.partStack) {
                // Check if parachute is deployed
                if (part.definition.type === 'parachute' && part.deployed) {
                    isParachuteDeployed = true;
                }

                // Check for fairings - they reduce drag
                if (part.definition.type === 'fairing' && part.definition.stats.dragReduction) {
                    totalDragReduction = Math.max(totalDragReduction, part.definition.stats.dragReduction);
                }
            }

            if (isParachuteDeployed) {
                Cd = 1.5; // High drag
                area = 50; // Big parachute area (~8m diameter)
            } else if (totalDragReduction > 0) {
                Cd = Cd * (1 - totalDragReduction);
            }
        }

        return { Cd, area, isParachuteDeployed };
    }

    /**
     * Apply aerodynamic torque (pendulum effect) when parachute is deployed
     */
    private applyAeroTorque(rocket: AeroRocketData, dragForce: Vector2, dt: number): void {
        // Center of Pressure is at the top of the rocket (parachute attach point)
        const centerOfPressureY = rocket.getTotalHeight() / 2;

        // Calculate moment arm in local frame
        const armLocal = new Vector2(
            0 - rocket.centerOfMass.x,
            centerOfPressureY - rocket.centerOfMass.y
        );

        // Rotate arm to world orientation
        const angle = rocket.rotation - Math.PI / 2;
        const ax = armLocal.x * Math.cos(angle) - armLocal.y * Math.sin(angle);
        const ay = armLocal.x * Math.sin(angle) + armLocal.y * Math.cos(angle);
        const armWorld = new Vector2(ax, ay);

        // Torque = r x F (2D cross product)
        const torque = armWorld.x * dragForce.y - armWorld.y * dragForce.x;

        // Apply angular acceleration: alpha = T / I
        const alpha = torque / Math.max(1, rocket.momentOfInertia);
        rocket.angularVelocity += alpha * dt;
    }
}
