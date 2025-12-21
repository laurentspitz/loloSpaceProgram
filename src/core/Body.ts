import { Vector2 } from './Vector2';
import type { OrbitalElements } from '../physics/OrbitUtils';
import type { Crater, Cloud } from '../systems/ProceduralUtils';
import type { CelestialBodyFeature } from '../systems/CelestialBodyFeatures';

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
    isStatic: boolean = false; // For physics engine interaction check
    meanAnomaly: number = 0; // For Keplerian motion

    // Visual Properties
    type: 'star' | 'gas_giant' | 'terrestrial' | 'moon' = 'terrestrial';
    atmosphereColor?: string;
    atmosphereOpacity?: number; // 0.0 to 1.0 (default 0.3)
    atmosphereRadiusScale?: number; // Multiplier of body radius (e.g. 1.2)
    ringColor?: string;
    ringInnerRadius?: number;
    ringOuterRadius?: number;

    // Physics Properties
    atmosphereDensity?: number; // Sea level density kg/m^3
    atmosphereHeight?: number; // Scale height or max height in meters (approx)
    atmosphereFalloff?: number; // Scale height for exponential falloff


    // Procedural Features (legacy)
    craters: Crater[] = [];
    clouds: Cloud[] = [];
    hasStorms: boolean = false; // For Jupiter

    // Modular Features
    features: CelestialBodyFeature[] = [];

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

    /**
     * Get atmospheric density at a given altitude
     * @param altitude Altitude in meters
     * @returns Density in kg/m^3
     */
    getAtmosphericDensity(altitude: number): number {
        if (!this.atmosphereDensity || !this.atmosphereFalloff || !this.atmosphereHeight) {
            return 0;
        }

        if (altitude > this.atmosphereHeight) {
            return 0;
        }

        // Exponential atmosphere model
        // rho = rho0 * e^(-h / H)
        return this.atmosphereDensity * Math.exp(-altitude / this.atmosphereFalloff);
    }
}
