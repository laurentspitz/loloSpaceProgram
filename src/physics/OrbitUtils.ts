import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { Physics } from './Physics';

export interface OrbitalElements {
    a: number; // Semi-major axis
    b: number; // Semi-minor axis
    c: number; // Distance from center to focus
    e: number; // Eccentricity
    omega: number; // Rotation angle
    focusOffset: Vector2; // Vector from focus (parent) to center of ellipse
    meanAnomaly0: number; // Initial mean anomaly at the time of calculation
}

export class OrbitUtils {
    static calculateOrbit(body: Body, centerBody: Body): OrbitalElements | null {
        // Relative position and velocity
        const r = body.position.sub(centerBody.position);
        const v = body.velocity.sub(centerBody.velocity);

        const rMag = r.mag();
        const vMag = v.mag();

        // Standard Gravitational Parameter
        const mu = Physics.G * (centerBody.mass + body.mass);

        // Specific Orbital Energy
        const epsilon = (vMag * vMag) / 2 - mu / rMag;

        // Semi-major axis (a)
        // epsilon = -mu / (2a)  =>  a = -mu / (2 * epsilon)
        const a = -mu / (2 * epsilon);

        // Eccentricity vector
        // e = ( (v^2 - mu/r)*r - (r.v)*v ) / mu
        const rDotV = r.x * v.x + r.y * v.y;
        const eVec = r.scale(vMag * vMag - mu / rMag).sub(v.scale(rDotV)).scale(1 / mu);
        const e = eVec.mag();

        if (e >= 1 || a < 0) {
            // Hyperbolic/Parabolic or invalid
            return null;
        }

        // Semi-minor axis (b)
        const b = a * Math.sqrt(1 - e * e);

        // Distance from center to focus (c)
        const c = Math.sqrt(a * a - b * b);

        // Angle of periapsis (omega)
        const omega = Math.atan2(eVec.y, eVec.x);

        // Center of the ellipse relative to focus
        // Center relative to focus (0,0) is (-c, 0) rotated by omega.
        const centerX = -c * Math.cos(omega);
        const centerY = -c * Math.sin(omega);
        const focusOffset = new Vector2(centerX, centerY);

        // Calculate initial mean anomaly from current position
        const meanAnomaly0 = OrbitUtils.calculateMeanAnomalyFromPosition(r, e, omega);

        return { a, b, c, e, omega, focusOffset, meanAnomaly0 };
    }

    static calculateMeanAnomalyFromPosition(
        r: Vector2,
        e: number,
        omega: number
    ): number {
        // Calculate angle of position vector
        const posAngle = Math.atan2(r.y, r.x);

        // True anomaly is the angle from periapsis
        const nu = posAngle - omega;

        // Calculate eccentric anomaly from true anomaly
        // tan(E/2) = sqrt((1-e)/(1+e)) * tan(nu/2)
        const E = 2 * Math.atan2(
            Math.sqrt(1 - e) * Math.sin(nu / 2),
            Math.sqrt(1 + e) * Math.cos(nu / 2)
        );

        // Mean anomaly from eccentric anomaly
        // M = E - e sin E
        let M = E - e * Math.sin(E);

        // Normalize to [0, 2π]
        while (M < 0) M += Math.PI * 2;
        while (M > Math.PI * 2) M -= Math.PI * 2;

        return M;
    }

    static updateBodyPosition(body: Body, deltaTime: number) {
        if (!body.parent || !body.orbit) return;

        const mu = Physics.G * (body.parent.mass + body.mass);
        const a = body.orbit.a;
        const e = body.orbit.e;

        // Mean motion n = sqrt(mu / a^3)
        const n = Math.sqrt(mu / Math.pow(a, 3));

        // Update Mean Anomaly
        body.meanAnomaly += n * deltaTime;
        body.meanAnomaly %= (Math.PI * 2);

        // Solve Kepler Equation: M = E - e sin E
        // Newton-Raphson iteration for better convergence
        let E = body.meanAnomaly;
        if (e > 0.8) E = Math.PI; // Initial guess for high eccentricity

        for (let i = 0; i < 10; i++) {
            const f = E - e * Math.sin(E) - body.meanAnomaly;
            const df = 1 - e * Math.cos(E);
            E = E - f / df;
        }

        // Calculate position in orbital plane relative to focus
        // x = a(cos E - e)
        // y = b sin E
        const x = a * (Math.cos(E) - e);
        const y = body.orbit.b * Math.sin(E);

        // Rotate by omega
        const cosO = Math.cos(body.orbit.omega);
        const sinO = Math.sin(body.orbit.omega);

        const rotX = x * cosO - y * sinO;
        const rotY = x * sinO + y * cosO;

        // Update position
        body.position.x = body.parent.position.x + rotX;
        body.position.y = body.parent.position.y + rotY;
    }
}
