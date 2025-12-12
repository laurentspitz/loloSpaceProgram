import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';

/**
 * Debris - Represents a detached rocket stage or part
 */
export class Debris extends Body {
    rotation: number = 0;
    angularVelocity: number = 0;
    width: number;
    height: number;
    texture: string | null = null;
    parts: any[] = []; // The parts that make up this debris
    lifetime: number = 30; // Seconds before debris expires
    age: number = 0; // Time since creation

    constructor(position: Vector2, velocity: Vector2, mass: number, parts: any[], lifetime: number = 30) {
        // Calculate width from parts for radius
        let maxWidth = 1;
        let totalHeight = 0;
        parts.forEach(p => {
            if (p.definition) {
                if (p.definition.width && p.definition.width > maxWidth) {
                    maxWidth = p.definition.width;
                }
                totalHeight += p.definition.height || 0;
            }
        });

        super(
            "Debris",
            mass,
            maxWidth / 2, // Radius = half of width (not height)
            "#AAAAAA",
            position,
            velocity
        );

        this.parts = parts;
        this.lifetime = lifetime;
        this.width = maxWidth;
        this.height = totalHeight;
    }

    update(dt: number) {
        // Call parent to update position based on velocity (Velocity Verlet)
        super.update(dt);

        // Apply simple rotation
        this.rotation += this.angularVelocity * dt;
        // Update age
        this.age += dt;
    }

    /**
     * Check if debris should be removed
     */
    isExpired(): boolean {
        return this.age >= this.lifetime;
    }
}
