import type { ISimulation } from './ISimulation';
import { SimulationV1 } from './v1';
import { SimulationV2 } from './v2';
import { FeatureFlags } from '../config/FeatureFlags';

/**
 * SimulationFactory - Creates the appropriate simulation based on feature flags
 */
export function createSimulation(): ISimulation {
    if (FeatureFlags.PHYSICS_V2) {
        console.log('🏭 Creating SimulationV2 (100% Matter.js)');
        return new SimulationV2();
    } else {
        console.log('🏭 Creating SimulationV1 (N-body + CollisionManager)');
        return new SimulationV1();
    }
}

// Re-export types and implementations
export type { ISimulation } from './ISimulation';
export { SimulationV1 } from './v1';
export { SimulationV2 } from './v2';
