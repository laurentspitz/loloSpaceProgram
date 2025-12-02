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

    constructor(position: Vector2, velocity: Vector2, mass: number, parts: any[]) {
        super(
            "Debris",
            mass,
            2, // Approximate radius
            "#AAAAAA",
            position,
            velocity
        );

        this.parts = parts;

        // Calculate dimensions based on parts
        // This is a simplification, ideally we'd calculate bounding box
        this.width = 2.5;
        this.height = 0;
        parts.forEach(p => {
            if (p.definition) {
                this.height += p.definition.height;
            }
        });
    }

    update(dt: number) {
        // Apply simple rotation
        this.rotation += this.angularVelocity * dt;
    }
}
