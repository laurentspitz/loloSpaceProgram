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

            // PATCHED CONICS: Find if this body is near any surface
            // If within threshold distance of a body, only use that body's gravity
            let dominantBody: Body | null = null;
            let minAltitude = Infinity;
            const PATCHED_CONICS_THRESHOLD = 100000; // 100km - use single-body gravity below this altitude

            for (const other of bodies) {
                if (body === other) continue;
                const dist = body.position.distanceTo(other.position);
                const altitude = dist - other.radius;

                if (altitude < minAltitude) {
                    minAltitude = altitude;
                    dominantBody = other;
                }
            }

            // Decide which bodies to include in gravity calculation
            const usePatched = minAltitude < PATCHED_CONICS_THRESHOLD && dominantBody;

            for (const other of bodies) {
                if (body === other) continue;

                // PATCHED CONICS: If near surface, only use dominant body
                if (usePatched && other !== dominantBody) {
                    continue; // Skip non-dominant bodies
                }

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
            const accel = this._totalForce.scale(1 / body.mass);

            return accel;
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
