import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';
import { Debris } from '../entities/Debris';
import type { RocketConfig } from '../config';
import { CollisionManager } from '../physics/CollisionManager';

/**
 * ISimulation - Common interface for simulation modules
 * 
 * Allows swapping between V1 (N-body + CollisionManager) and V2 (Matter.js)
 */
export interface ISimulation {
    // ========================================
    // Lifecycle
    // ========================================

    /**
     * Initialize the simulation with optional rocket configuration
     */
    init(rocketConfig?: RocketConfig): void;

    /**
     * Step the simulation forward
     * @param dt Real delta time in seconds
     * @param timeScale Game time scale multiplier
     * @param timeWarp Physics time warp multiplier
     */
    step(dt: number, timeScale: number, timeWarp: number): void;

    /**
     * Clean up resources
     */
    dispose(): void;

    // ========================================
    // Accessors
    // ========================================

    /**
     * Get the rocket instance
     */
    getRocket(): Rocket | null;

    /**
     * Get all celestial bodies in the simulation
     */
    getBodies(): Body[];

    /**
     * Get all debris in the simulation
     */
    getDebris(): Debris[];

    /**
     * Get the collision manager (for UI/debugging)
     */
    getCollisionManager(): CollisionManager | null;

    // ========================================
    // State
    // ========================================

    /**
     * Check if rocket is resting on a surface
     */
    isRocketResting(): boolean;

    /**
     * Get the body the rocket is resting on (if any)
     */
    getRestingBody(): Body | null;

    /**
     * Break the resting state (when teleporting rocket, etc.)
     */
    breakRestingState(): void;

    // ========================================
    // Events
    // ========================================

    /**
     * Set callback for collision events
     */
    setCollisionHandler(handler: (bodyA: Body | Rocket, bodyB: Body | Rocket) => void): void;

    /**
     * Set callback for stage separation (debris creation)
     */
    setStageSeparationHandler(handler: (debris: Debris) => void): void;
}
