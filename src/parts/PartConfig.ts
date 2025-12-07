import { Vector2 } from '../core/Vector2';

/**
 * Configuration interface for parts (loaded from config.json)
 */
export interface PartConfig {
    id: string;
    name: string;
    type: 'capsule' | 'tank' | 'engine' | 'rcs' | 'decoupler' | 'structure';
    description: string;
    dimensions: {
        width: number;    // meters
        height: number;   // meters
    };
    stats: {
        mass: number;     // kg
        cost: number;     // credits
        fuel?: number;    // kg (for tanks)
        thrust?: number;  // N (for engines)
        isp?: number;     // seconds (for engines)
        electricity?: number;     // Battery capacity (Electric Charge - EC)
        chargeRate?: number;      // Generation/Consumption rate (per sec)
        sasConsumption?: number;  // Consumption per second when SAS active
    };
    nodes: Array<{
        id: string;
        position: { x: number; y: number };
        direction: { x: number; y: number };
        type: 'top' | 'bottom';
    }>;
    visual?: {
        effect?: 'standard' | 'blue_flame' | 'rcs';
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
