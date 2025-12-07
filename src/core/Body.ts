import { Vector2 } from './Vector2';
import type { OrbitalElements } from '../physics/OrbitUtils';
import type { Crater, Cloud } from '../systems/ProceduralUtils';

export class Body {
    position: Vector2;
    velocity: Vector2;
    acceleration: Vector2;
    mass: number;
    radius: number;
    color: string;
    name: string;
    path: Vector2[] = [];
    parent: Body | null = null;
    orbit: OrbitalElements | null = null;
    isLocked: boolean = false; // If true, use Keplerian motion instead of N-body
    meanAnomaly: number = 0; // For Keplerian motion

    // Visual Properties
    type: 'star' | 'gas_giant' | 'terrestrial' | 'moon' = 'terrestrial';
    atmosphereColor?: string;
    ringColor?: string;
    ringInnerRadius?: number;
    ringOuterRadius?: number;

    // Procedural Features
    craters: Crater[] = [];
    clouds: Cloud[] = [];
    hasStorms: boolean = false; // For Jupiter

    // Matter.js integration
    matterBody: any = null; // Matter.Body reference

    // Hierarchy and UI
    description?: string;
    children: Body[] = [];


    constructor(name: string, mass: number, radius: number, color: string, position: Vector2, velocity: Vector2) {
        this.name = name;
        this.mass = mass;
        this.radius = radius;
        this.color = color;
        this.position = position;
        this.velocity = velocity;
        this.acceleration = new Vector2(0, 0);
    }

    update(deltaTime: number) {
        // Velocity Verlet integration step 1
        this.position = this.position.add(this.velocity.scale(deltaTime)).add(this.acceleration.scale(0.5 * deltaTime * deltaTime));

        // Store path for visualization (limit size if needed)
        if (this.path.length > 1000) {
            this.path.shift();
        }
        this.path.push(this.position.clone());
    }
}
