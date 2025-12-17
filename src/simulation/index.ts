import type { ISimulation } from './ISimulation';
import { Simulation } from './Simulation';

/**
 * Create and return the simulation instance
 */
export function createSimulation(): ISimulation {
    console.log('🏭 Creating Simulation');
    return new Simulation();
}

// Re-export types and implementations
export type { ISimulation } from './ISimulation';
export { Simulation } from './Simulation';
