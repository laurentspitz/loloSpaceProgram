import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';
import { Vector2 } from '../core/Vector2';

/**
 * Information about a body's Sphere of Influence
 */
export interface SOIInfo {
    body: Body;
    soiRadius: number;
    distanceFromPosition: number;
    isInside: boolean;
}

/**
 * Information about an SOI encounter during trajectory prediction
 */
export interface SOIEncounter {
    body: Body;
    entryPoint: Vector2;
    entryTime: number;  // Seconds from start of prediction
    soiRadius: number;
}

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

    /**
     * Check if a position is inside a body's SOI (position-based, not rocket-based)
     */
    static isPositionInsideSOI(position: Vector2, body: Body): boolean {
        if (!body.parent) return false; // Sun/Stars don't have finite SOI

        const dist = position.distanceTo(body.position);
        const soiRadius = this.calculateSOI(body);
        return dist < soiRadius;
    }

    /**
     * Get distance from a position to the edge of a body's SOI
     * Positive = outside SOI, Negative = inside SOI
     */
    static getDistanceToSOI(position: Vector2, body: Body): number {
        if (!body.parent) return Infinity;

        const dist = position.distanceTo(body.position);
        const soiRadius = this.calculateSOI(body);
        return dist - soiRadius;
    }

    /**
     * Get all SOIs that are relevant from a given position
     * Returns sorted by distance (closest first)
     */
    static getRelevantSOIs(position: Vector2, bodies: Body[]): SOIInfo[] {
        const soiInfos: SOIInfo[] = [];

        for (const body of bodies) {
            // Skip stars (infinite SOI)
            if (!body.parent) continue;

            const soiRadius = this.calculateSOI(body);
            const distance = position.distanceTo(body.position);

            soiInfos.push({
                body,
                soiRadius,
                distanceFromPosition: distance,
                isInside: distance < soiRadius
            });
        }

        // Sort by distance
        soiInfos.sort((a, b) => a.distanceFromPosition - b.distanceFromPosition);
        return soiInfos;
    }

    /**
     * Find all children of a body that have finite SOIs
     * (e.g., Moon is a child of Earth)
     */
    static findChildrenWithSOI(parentBody: Body, allBodies: Body[]): Body[] {
        return allBodies.filter(b => b.parent === parentBody && b.type !== 'star');
    }

    /**
     * Find closest approach to any SOI along trajectory points
     * Returns encounters sorted by time (earliest first)
     */
    static findSOIEncountersAlongPath(
        trajectoryPoints: Vector2[],
        timeStep: number,
        currentBody: Body,
        allBodies: Body[]
    ): SOIEncounter[] {
        const encounters: SOIEncounter[] = [];
        const encounteredBodies = new Set<Body>();

        // Get potential SOI bodies to check
        // 1. Children of current body (e.g., Moon when orbiting Earth)
        const children = this.findChildrenWithSOI(currentBody, allBodies);

        // 2. Siblings (other planets/moons orbiting the same parent)
        const siblings = currentBody.parent
            ? allBodies.filter(b => b.parent === currentBody.parent && b !== currentBody)
            : [];

        const potentialBodies = [...children, ...siblings];

        // Check each trajectory point
        for (let i = 0; i < trajectoryPoints.length; i++) {
            const point = trajectoryPoints[i];
            const time = i * timeStep;

            for (const body of potentialBodies) {
                // Skip if already encountered this body
                if (encounteredBodies.has(body)) continue;

                const soiRadius = this.calculateSOI(body);
                const distance = point.distanceTo(body.position);

                // Check if we're entering the SOI
                if (distance < soiRadius) {
                    encounters.push({
                        body,
                        entryPoint: point.clone(),
                        entryTime: time,
                        soiRadius
                    });
                    encounteredBodies.add(body);
                }
            }
        }

        return encounters;
    }

    /**
     * Find the dominant body for a given position (not tied to a rocket)
     */
    static findDominantBodyForPosition(position: Vector2, bodies: Body[]): Body {
        // Get all SOIs sorted by distance
        const soiInfos = this.getRelevantSOIs(position, bodies);

        // Check smallest SOIs first (moons, then planets)
        const moons = soiInfos.filter(s => s.body.type === 'moon' && s.isInside);
        if (moons.length > 0) {
            return moons[0].body;
        }

        const planets = soiInfos.filter(s =>
            (s.body.type === 'terrestrial' || s.body.type === 'gas_giant') && s.isInside
        );
        if (planets.length > 0) {
            return planets[0].body;
        }

        // Default to Sun/Star
        const star = bodies.find(b => b.type === 'star');
        return star || bodies[0];
    }
}
