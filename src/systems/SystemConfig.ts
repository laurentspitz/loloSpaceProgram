import { Vector2 } from '../core/Vector2';
import type { CelestialBodyFeature } from './CelestialBodyFeatures';

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
    atmosphereOpacity?: number;
    atmosphereRadiusScale?: number;

    // Physics
    atmosphereDensity?: number;
    atmosphereHeight?: number;
    atmosphereFalloff?: number;

    description: string;
    satellites?: CelestialBodyConfig[]; // Moons or planets (if this is a star)

    // Modular features (replaces legacy ringColor, hasStorms, etc.)
    features?: CelestialBodyFeature[];
}

export interface StarSystemConfig {
    name: string;
    position: Vector2; // Position of the central star(s) in the universe
    velocity: Vector2; // Velocity of the system
    rootBodies: CelestialBodyConfig[]; // Usually the star(s)
}
