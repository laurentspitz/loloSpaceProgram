import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';
import { Physics } from './Physics';

/**
 * SphereOfInfluence - Determines which celestial body has dominant gravitational influence
 */
export class SphereOfInfluence {
    /**
     * Find the body with dominant gravitational influence on the rocket
     * Uses gravitational force magnitude to determine dominance
     * 
     * @param rocket - The rocket to check
     * @param bodies - All celestial bodies in the system
     * @returns The body with the strongest gravitational pull on the rocket
     */
    static findDominantBody(rocket: Rocket, bodies: Body[]): Body {
        let dominantBody: Body | null = null;
        let maxForce = 0;

        for (const body of bodies) {
            // Skip the rocket itself
            if (body === rocket.body) continue;

            // Calculate distance from rocket to body
            const distance = rocket.body.position.distanceTo(body.position);

            // Calculate gravitational force magnitude: F = G * M * m / r^2
            // Since we're comparing forces, we can ignore the rocket's mass (it cancels out)
            // So we calculate: F/m = G * M / r^2 (which is gravitational acceleration)
            const forceMagnitude = (Physics.G * body.mass) / (distance * distance);

            // Update dominant body if this body has stronger influence
            if (forceMagnitude > maxForce) {
                maxForce = forceMagnitude;
                dominantBody = body;
            }
        }

        // Fallback to Sun if no dominant body found (shouldn't happen)
        if (!dominantBody) {
            dominantBody = bodies.find(b => b.name === 'Sun') || bodies[0];
        }

        return dominantBody;
    }

    /**
     * Get the name of the dominant body for display purposes
     */
    static getDominantBodyName(rocket: Rocket, bodies: Body[]): string {
        return this.findDominantBody(rocket, bodies).name;
    }
}
