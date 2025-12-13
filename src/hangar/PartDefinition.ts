import { Vector2 } from '../core/Vector2';

export type PartType = 'capsule' | 'tank' | 'engine' | 'booster' | 'decoupler' | 'structure' | 'rcs' | 'parachute' | 'fairing';

export interface PartStats {
    mass: number;       // kg
    cost: number;       // credits
    fuel?: number;      // kg of fuel
    thrust?: number;    // Newtons
    isp?: number;       // seconds
    electricity?: number;     // Battery capacity (EC)
    chargeRate?: number;      // Generation/Consumption rate (EC/s)
    sasConsumption?: number;  // SAS Consumption (EC/s)
    dragReduction?: number;   // Fairing drag reduction (0-1)
}

export interface ConnectionNode {
    id: string;
    position: Vector2;  // Relative to part center
    direction: Vector2; // Normal vector (usually (0,1) or (0,-1))
    type: 'top' | 'bottom' | 'standard';
}

export interface PartDefinition {
    id: string;
    name: string;
    type: PartType;
    description: string;
    texture: string;
    width: number;      // meters
    height: number;     // meters
    creationYear?: number;
    country?: string;
    agency?: string;
    stats: PartStats;
    nodes: ConnectionNode[];
    effect?: 'standard' | 'blue_flame' | 'rcs';
    cockpit?: {
        themeId: string;
    };
    family?: string; // Rocket Family (e.g. "R7", "Atlas")
    // Fairing-specific visual properties
    visual?: {
        textureLeft?: string;
        textureRight?: string;
    };
}
