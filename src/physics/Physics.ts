import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { OrbitUtils } from './OrbitUtils';

import { Settings } from '../config';

export class Physics {
    static G = Settings.PHYSICS.G; // Gravitational constant

    // Scratch vectors for memory optimization
    private static _dir = new Vector2(0, 0);
    private static _force = new Vector2(0, 0);
    private static _totalForce = new Vector2(0, 0);
    private static _newAcc = new Vector2(0, 0);

    static update(bodies: Body[], deltaTime: number) {
        // Calculate new accelerations
        const newAccelerations = bodies.map(body => {
            if (body.isLocked) return new Vector2(0, 0); // Locked bodies don't feel forces

            this._totalForce.set(0, 0);

            for (const other of bodies) {
                if (body === other) continue;

                // dist = body.distanceTo(other)
                // We'll calculte manually to avoid creating temporary objects if necessary,
                // but distanceToSquared returns a number which is fine.
                // distanceTo also returns a number.
                const distSq = body.position.distanceToSquared(other.position);
                const dist = Math.sqrt(distSq);

                if (dist === 0) continue; // Avoid division by zero

                const forceMag = (Physics.G * body.mass * other.mass) / distSq;

                // direction = (other - body).normalize()
                this._dir.subVectors(other.position, body.position).normalizeInPlace();

                // force = dir * mag
                this._force.scaleVector(this._dir, forceMag);

                // total += force
                this._totalForce.addInPlace(this._force);
            }

            // a = F / m
            return this._totalForce.scale(1 / body.mass);
            // Note: Returning a new Vector2 here is okay (N allocs vs N^2 allocs), 
            // but for max perf we could pool these too. 
            // For now, eliminating the inner loop allocs is the big win.
        });

        // Update bodies
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            const newAcc = newAccelerations[i];

            // Velocity Verlet integration step 2
            // v(t+dt) = v(t) + 0.5 * (a(t) + a(t+dt)) * dt

            // deltaV = (acc + newAcc) * 0.5 * dt
            this._newAcc.addVectors(body.acceleration, newAcc).scaleInPlace(0.5 * deltaTime);

            // v += deltaV
            body.velocity.addInPlace(this._newAcc);

            // Update acceleration for next step
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
