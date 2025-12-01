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

            // Symplectic Euler integration (same as Physics.ts)
            simVel = simVel.add(acceleration.scale(timeStep));
            simPos = simPos.add(simVel.scale(timeStep));

            // Check for collision (stop prediction if crashes)
            // Optimization: only check nearest body?
        }

        return points;
    }
}
