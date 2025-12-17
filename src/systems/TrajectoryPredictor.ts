import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { Rocket } from '../entities/Rocket';
import { Physics } from '../physics/Physics';

/**
 * TrajectoryPredictor - Simulates future path of the rocket
 */
export class TrajectoryPredictor {
    static predict(rocket: Rocket, bodies: Body[], timeStep: number, numSteps: number): Vector2[] {
        const points: Vector2[] = [];

        // Clone rocket state (position and velocity)
        // We don't need full body clone, just pos/vel for simulation
        let simPos = rocket.body.position.clone();
        let simVel = rocket.body.velocity.clone();

        // We only simulate gravity, ignoring thrust for orbit prediction
        // (Standard behavior in KSP unless actively burning)

        for (let i = 0; i < numSteps; i++) {
            points.push(simPos.clone());

            // Calculate total gravitational force
            let totalForce = new Vector2(0, 0);

            for (const body of bodies) {
                if (body === rocket.body) continue; // Skip self

                // Simple gravity calculation (same as Physics.ts but simplified)
                const dist = simPos.distanceTo(body.position);
                const forceMag = (Physics.G * body.mass) / (dist * dist); // Mass of rocket cancels out in a = F/m

                const dir = body.position.sub(simPos).normalize();
                totalForce = totalForce.add(dir.scale(forceMag));
            }

            // Apply acceleration: a = F (since we used GM/r^2, this is acceleration directly)
            // Wait, forceMag above is Acceleration if we don't multiply by rocket mass
            // Physics.G * body.mass / r^2 IS acceleration (g)

            const acceleration = totalForce;

            // Apply Atmospheric Drag (Prediction)
            // Simplified physics prediction
            // Find body with atmosphere we are in
            let nearestBody: Body | null = null;
            let minDist = Infinity; // This minDist is for finding the closest body, not necessarily for atmosphere

            for (const body of bodies) {
                if (!body.atmosphereHeight) continue;
                const d = simPos.distanceTo(body.position);
                if (d < minDist) { // Find the physically closest body
                    minDist = d;
                    nearestBody = body;
                }
            }

            if (nearestBody) {
                // Altitude above VISUAL radius
                const PLANET_SCALE = 1.0;
                const altitude = minDist - (nearestBody.radius * PLANET_SCALE);

                // Calculate density
                // rho = rho0 * exp(-h / H)
                const rho = (nearestBody.atmosphereDensity || 0) * Math.exp(-altitude / (nearestBody.atmosphereFalloff || 1));

                if (rho > 0.0001) {
                    // Velocity relative to atmosphere (simplified: typically close to orbital, but just use velocity magnitude)
                    // relative velocity: rocket vel - body vel
                    const relVel = simVel.sub(nearestBody.velocity);
                    const speed = relVel.mag();

                    // Drag: F = 0.5 * rho * v^2 * Cd * A

                    // Check if rocket has deployed parachute
                    // Ideally we pass this in, but we can check the rocket instance provided
                    let Cd = 0.2; // Standard Drag
                    let Area = 7.0; // Standard Area

                    let hasParachute = false;
                    if (rocket.partStack) {
                        hasParachute = rocket.partStack.some(p => p.definition.type === 'parachute' && p.deployed);
                    }

                    if (hasParachute) {
                        Cd = 1.5;
                        Area = 50.0;
                    }

                    // User complained "no impact", so let's BOOST the multiplier significantly
                    // Was 100.0, trying 500.0 to ensure visibility
                    // Now reduced to 20.0 since physics is fixed (3x scale)
                    const DragMultiplier = 20.0;

                    const dragForceMag = 0.5 * rho * speed * speed * Cd * Area * DragMultiplier;
                    const dragDir = relVel.normalize().scale(-1);
                    const dragAcc = dragDir.scale(dragForceMag / 1000); // 1000kg dummy mass? 
                    // Wait, current logic: totalForce is ACCELERATION (G * M / r^2). 
                    // No, forceMag calculation was (Physics.G * body.mass) / (dist * dist). 
                    // That IS acceleration (g). 
                    // So we must add drag ACCELERATION.
                    // a_drag = F_drag / m. 
                    // Let's assume rocket mass ~5000kg (Mk1 + Tank + Engine dry is ~2-3t, wet ~5t).
                    const estimatedMass = 5000;

                    acceleration.addInPlace(dragAcc.scale(1000 / estimatedMass)); // Adjusted scale
                    // Actually better:
                    const dragAccelVec = dragDir.scale(dragForceMag / estimatedMass);
                    acceleration.addInPlace(dragAccelVec);
                }
            }

            // Symplectic Euler integration (same as Physics.ts)
            simVel = simVel.add(acceleration.scale(timeStep));
            simPos = simPos.add(simVel.scale(timeStep));

            // Check for collision (stop prediction if crashes)
            // Optimization: only check nearest body?
        }

        return points;
    }
}
