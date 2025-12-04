import { Vector2 } from '../core/Vector2';
import type { Rocket } from '../entities/Rocket';
import type { Body } from '../core/Body';

/**
 * ManeuverNode - Represents a planned orbital maneuver
 * Delta-v components are in the orbital reference frame:
 * - Prograde: Direction of orbital motion (positive = speed up)
 * - Normal: Perpendicular to orbital plane (in 2D: rotated 90° from prograde)
 * - Radial: Direction from center body (positive = outward)
 * 
 * Stores FIXED orbital position to prevent drift as the rocket moves
 */
export class ManeuverNode {
    id: string;
    eccentricAnomaly: number; // Eccentric anomaly (E) - fixed point on orbit
    orbitalCoords: { x: number; y: number }; // Coords in orbital plane
    orbitTime: number; // DEPRECATED: kept for compatibility, but not used for position
    progradeΔv: number; // m/s
    normalΔv: number; // m/s
    radialΔv: number; // m/s

    constructor(
        eccentricAnomaly: number,
        orbitalCoords: { x: number; y: number },
        orbitTime: number = 0, // For compatibility
        progradeΔv = 0,
        normalΔv = 0,
        radialΔv = 0
    ) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.eccentricAnomaly = eccentricAnomaly;
        this.orbitalCoords = orbitalCoords;
        this.orbitTime = orbitTime; // Store but don't use for position
        this.progradeΔv = progradeΔv;
        this.normalΔv = normalΔv;
        this.radialΔv = radialΔv;
    }

    /**
     * Get total magnitude of delta-v vector
     */
    getTotalΔv(): number {
        return Math.sqrt(
            this.progradeΔv * this.progradeΔv +
            this.normalΔv * this.normalΔv +
            this.radialΔv * this.radialΔv
        );
    }

    /**
     * Calculate the world-space position of this maneuver node
     * Uses FIXED orbital coordinates to prevent drift
     */
    getWorldPosition(rocket: Rocket, bodies: Body[]): Vector2 {
        // Find the body we're orbiting
        const parentBody = rocket.body.parent;
        if (!parentBody || !rocket.body.orbit) {
            return rocket.body.position.clone();
        }

        const orbit = rocket.body.orbit;

        // Use stored orbital coordinates (fixed in orbital plane)
        const x = this.orbitalCoords.x;
        const y = this.orbitalCoords.y;

        // Rotate by current omega (argument of periapsis)
        const cosO = Math.cos(orbit.omega);
        const sinO = Math.sin(orbit.omega);
        const rotX = x * cosO - y * sinO;
        const rotY = x * sinO + y * cosO;

        // Add parent body position
        return new Vector2(
            parentBody.position.x + rotX,
            parentBody.position.y + rotY
        );
    }

    /**
     * Calculate time from current rocket position to this maneuver node
     * Returns time in seconds
     */
    getTimeFromNow(rocket: Rocket): number {
        const parentBody = rocket.body.parent;
        if (!parentBody || !rocket.body.orbit) {
            return 0;
        }

        const orbit = rocket.body.orbit;
        const mu = 6.67430e-11 * parentBody.mass;
        const n = Math.sqrt(mu / Math.pow(orbit.a, 3)); // Mean motion

        // Get current mean anomaly of rocket
        const currentM = rocket.body.meanAnomaly || 0;

        // Get mean anomaly of the node
        // M = E - e*sin(E)
        const nodeM = this.eccentricAnomaly - orbit.e * Math.sin(this.eccentricAnomaly);

        // Calculate the difference, handling wrap-around
        let deltaM = nodeM - currentM;

        // Ensure we go forward in time (positive deltaM)
        while (deltaM < 0) {
            deltaM += 2 * Math.PI;
        }

        // Convert mean anomaly difference to time
        return deltaM / n;
    }

    /**
     * Calculate the velocity at the maneuver node position
     */
    getVelocityAtNode(rocket: Rocket, bodies: Body[]): Vector2 {
        const parentBody = rocket.body.parent;
        if (!parentBody || !rocket.body.orbit) {
            return rocket.body.velocity.clone();
        }

        const orbit = rocket.body.orbit;
        const mu = 6.67430e-11 * (parentBody.mass + rocket.body.mass);

        // Use stored Eccentric Anomaly instead of recalculating from orbitTime
        const E = this.eccentricAnomaly;
        const e = orbit.e;

        // Velocity magnitude at this point using vis-viva equation
        const position = this.getWorldPosition(rocket, bodies);
        const r = position.sub(parentBody.position);
        const rMag = r.mag();
        const vMag = Math.sqrt(mu * (2 / rMag - 1 / orbit.a));

        // Velocity direction in orbital frame
        // v_x = -a * n * sin(E) / (1 - e*cos(E))
        // v_y = b * n * cos(E) / (1 - e*cos(E))
        const n = Math.sqrt(mu / Math.pow(orbit.a, 3));
        const factor = 1 / (1 - e * Math.cos(E));
        const vx = -orbit.a * n * Math.sin(E) * factor;
        const vy = orbit.b * n * Math.cos(E) * factor;

        // Rotate by omega
        const cosO = Math.cos(orbit.omega);
        const sinO = Math.sin(orbit.omega);
        const rotVx = vx * cosO - vy * sinO;
        const rotVy = vx * sinO + vy * cosO;

        return new Vector2(
            parentBody.velocity.x + rotVx,
            parentBody.velocity.y + rotVy
        );
    }

    /**
     * Get the world-space direction angle of the delta-v vector
     */
    getΔvDirection(rocket: Rocket, bodies: Body[]): number {
        const parentBody = rocket.body.parent;
        if (!parentBody) {
            return 0;
        }

        const position = this.getWorldPosition(rocket, bodies);
        const velocity = this.getVelocityAtNode(rocket, bodies);

        // Calculate orbital frame basis vectors
        const progradeDir = velocity.sub(parentBody.velocity).normalize();
        const radialDir = position.sub(parentBody.position).normalize();
        // Normal is perpendicular to prograde (in 2D: rotate 90°)
        const normalDir = new Vector2(-progradeDir.y, progradeDir.x);

        // Combine delta-v components
        const dvVector = progradeDir.scale(this.progradeΔv)
            .add(normalDir.scale(this.normalΔv))
            .add(radialDir.scale(this.radialΔv));

        return Math.atan2(dvVector.y, dvVector.x);
    }

    /**
     * Calculate the velocity after applying this maneuver
     */
    getPostManeuverVelocity(rocket: Rocket, bodies: Body[]): Vector2 {
        const parentBody = rocket.body.parent;
        if (!parentBody) {
            return rocket.body.velocity.clone();
        }

        const position = this.getWorldPosition(rocket, bodies);
        const velocity = this.getVelocityAtNode(rocket, bodies);

        // Work in parent's reference frame
        const relativeVelocity = velocity.sub(parentBody.velocity);

        // Calculate orbital frame basis vectors from RELATIVE velocity
        const progradeDir = relativeVelocity.normalize();
        const radialDir = position.sub(parentBody.position).normalize();
        const normalDir = new Vector2(-progradeDir.y, progradeDir.x);

        // Apply delta-v in orbital reference frame
        const dvVector = progradeDir.scale(this.progradeΔv)
            .add(normalDir.scale(this.normalΔv))
            .add(radialDir.scale(this.radialΔv));

        // Add delta-v to relative velocity, then convert back to absolute
        const newRelativeVelocity = relativeVelocity.add(dvVector);
        return parentBody.velocity.add(newRelativeVelocity);
    }
}
