import { Vector2 } from '../core/Vector2';

/**
 * Configuration interface for parts (loaded from config.json)
 */
export interface PartConfig {
    id: string;
    name: string;
    type: 'capsule' | 'tank' | 'engine' | 'booster' | 'rcs' | 'decoupler' | 'structure' | 'parachute' | 'fairing';
    description: string;
    dimensions: {
        width: number;    // meters
        height: number;   // meters
    };
    creationYear?: number; // Historical year part becomes available
    country?: string;      // USA, USSR, etc.
    agency?: string;       // Agency ID (e.g., 'nasa', 'okb1')
    stats: {
        mass: number;     // kg
        cost: number;     // credits
        fuel?: number;    // kg (for tanks)
        thrust?: number;  // N (for engines)
        isp?: number;     // seconds (for engines)
        electricity?: number;     // Battery capacity (Electric Charge - EC)
        chargeRate?: number;      // Generation/Consumption rate (per sec)
        sasConsumption?: number;  // Consumption per second when SAS active
        dragReduction?: number;   // Fairing drag reduction multiplier (0-1)
    };
    nodes: Array<{
        id: string;
        position: { x: number; y: number };
        direction: { x: number; y: number };
        type: 'top' | 'bottom' | 'standard';
    }>;
    visual?: {
        effect?: 'standard' | 'blue_flame' | 'rcs';
        textureLeft?: string;   // Fairing left half texture
        textureRight?: string;  // Fairing right half texture
    };
    dragSettings?: {
        dragCoeffStowed: number;
        dragCoeffDeployed: number;
        deployedArea: number; // m^2
    };
    cockpit?: {
        themeId: string;
    };
}

/**
 * Context passed to part behaviors during updates
 */
export interface PartContext {
    deltaTime: number;
    throttle?: number;
    active?: boolean;
    position?: Vector2;
    rotation?: number;
}

/**
 * Particle effect configuration
 */
export interface ParticleEffectConfig {
    type: string;
    colors?: {
        initial: { r: number; g: number; b: number };
        mid?: { r: number; g: number; b: number };
        final?: { r: number; g: number; b: number };
    };
    sizes?: {
        initial: number;
        max: number;
    };
}
