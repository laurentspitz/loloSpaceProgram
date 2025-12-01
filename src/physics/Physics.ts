import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { OrbitUtils } from './OrbitUtils';

export class Physics {
    static G = 6.67430e-11; // Gravitational constant

    static update(bodies: Body[], deltaTime: number) {
        // Calculate new accelerations
        const newAccelerations = bodies.map(body => {
            if (body.isLocked) return new Vector2(0, 0); // Locked bodies don't feel forces

            let totalForce = new Vector2(0, 0);

            for (const other of bodies) {
                if (body === other) continue;

                const dist = body.position.distanceTo(other.position);
                const forceMag = (Physics.G * body.mass * other.mass) / (dist * dist);
                const direction = other.position.sub(body.position).normalize();

                totalForce = totalForce.add(direction.scale(forceMag));
            }

            return totalForce.scale(1 / body.mass);
        });

        // Update bodies
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            const newAcc = newAccelerations[i];

            // Velocity Verlet integration step 2
            // v(t+dt) = v(t) + 0.5 * (a(t) + a(t+dt)) * dt
            const deltaV = body.acceleration.add(newAcc).scale(0.5 * deltaTime);
            body.velocity = body.velocity.add(deltaV);

            // Update position (already done in Body.update for step 1, but we need to coordinate)
            // Actually, standard Verlet:
            // r(t+dt) = r(t) + v(t)dt + 0.5*a(t)dt^2
            // v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))dt

            // Body.update does the position update.
            // We need to update position FIRST, then calculate new acceleration, then update velocity.

            body.acceleration = newAcc;
        }
    }

    static step(bodies: Body[], deltaTime: number) {
        // 1. Update positions
        // 1. Update positions
        bodies.forEach(b => {
            if (b.isLocked) {
                // Use analytic Keplerian motion for locked bodies (moons)
                // This ensures perfect stability and no jitter
                OrbitUtils.updateBodyPosition(b, deltaTime);
            } else {
                // Use Velocity Verlet for N-body physics
                b.update(deltaTime);
            }
        });

        // 2. Calculate new forces/accelerations and update velocities
        Physics.update(bodies, deltaTime);
    }
}
