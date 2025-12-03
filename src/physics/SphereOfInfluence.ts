import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';

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
        // Hierarchical SOI check
        // 1. Check Moons (smallest SOI)
        // 2. Check Planets (medium SOI)
        // 3. Default to Sun (infinite SOI)

        // Filter bodies by type
        const moons = bodies.filter(b => b.type === 'moon');
        const planets = bodies.filter(b => b.type === 'terrestrial' || b.type === 'gas_giant');
        const stars = bodies.filter(b => b.type === 'star');

        // Check if inside any Moon's SOI
        for (const moon of moons) {
            if (this.isInsideSOI(rocket, moon)) {
                return moon;
            }
        }

        // Check if inside any Planet's SOI
        for (const planet of planets) {
            if (this.isInsideSOI(rocket, planet)) {
                return planet;
            }
        }

        // Default to Sun (or first star)
        return stars[0] || bodies[0];
    }

    /**
     * Check if rocket is inside a body's Sphere of Influence
     */
    static isInsideSOI(rocket: Rocket, body: Body): boolean {
        if (!body.parent) return false; // Sun/Stars don't have finite SOI in this context

        const dist = rocket.body.position.distanceTo(body.position);
        const soiRadius = this.calculateSOI(body);
        const inside = dist < soiRadius;


        return inside;
    }

    /**
     * Calculate Sphere of Influence radius
     * Formula: r_SOI = a * (m / M)^(2/5) * scale_factor
     * a = semi-major axis (distance to parent)
     * m = mass of body
     * M = mass of parent
     * 
     * We use a scale factor of 0.75 for balanced SOI sizes
     * Moon is at 384k km (no artificial moonScale anymore)
     * Earth SOI ~1.5M km ensures Moon is well within Earth's influence
     */
    static calculateSOI(body: Body): number {
        if (!body.parent) return Infinity;

        // Approximate semi-major axis as current distance to parent (good enough for circular-ish orbits)
        const a = body.position.distanceTo(body.parent.position);
        const m = body.mass;
        const M = body.parent.mass;

        // Standard formula with scale factor for gameplay balance
        const scaleFactor = 0.75;
        return a * Math.pow(m / M, 0.4) * scaleFactor; // 2/5 = 0.4
    }

    /**
     * Get the name of the dominant body for display purposes
     */
    static getDominantBodyName(rocket: Rocket, bodies: Body[]): string {
        return this.findDominantBody(rocket, bodies).name;
    }
}
