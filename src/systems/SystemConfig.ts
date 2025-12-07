import { Vector2 } from '../core/Vector2';

export type BodyType = 'star' | 'gas_giant' | 'terrestrial' | 'moon';

export interface CelestialBodyConfig {
    name: string;
    mass: number;
    radius: number;
    color: string;
    distanceFromParent: number; // Distance in meters (x-axis initially)
    initialVelocity?: number;   // Tangential velocity in m/s (optional, calculated if omitted?)
    type: BodyType;
    atmosphereColor?: string;
    ringColor?: string;
    ringInner?: number; // relative to radius
    ringOuter?: number; // relative to radius
    description: string;
    hasStorms?: boolean;
    satellites?: CelestialBodyConfig[]; // Moons or planets (if this is a star)
}

export interface StarSystemConfig {
    name: string;
    position: Vector2; // Position of the central star(s) in the universe
    velocity: Vector2; // Velocity of the system
    rootBodies: CelestialBodyConfig[]; // Usually the star(s)
}
