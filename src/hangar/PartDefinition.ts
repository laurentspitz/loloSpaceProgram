import { Vector2 } from '../core/Vector2';

export type PartType = 'capsule' | 'tank' | 'engine' | 'decoupler';

export interface PartStats {
    mass: number;       // kg
    cost: number;       // credits
    fuel?: number;      // kg of fuel
    thrust?: number;    // Newtons
    isp?: number;       // seconds
}

export interface ConnectionNode {
    id: string;
    position: Vector2;  // Relative to part center
    direction: Vector2; // Normal vector (usually (0,1) or (0,-1))
    type: 'top' | 'bottom';
}

export interface PartDefinition {
    id: string;
    name: string;
    type: PartType;
    description: string;
    texture: string;
    width: number;      // meters
    height: number;     // meters
    stats: PartStats;
    nodes: ConnectionNode[];
}
