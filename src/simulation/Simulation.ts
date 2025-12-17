import type { ISimulation } from './ISimulation';
import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';
import { Debris } from '../entities/Debris';
import { Physics } from '../physics/Physics';
import { CollisionManager } from '../physics/CollisionManager';
import { SceneSetup } from '../SceneSetup';
import { Settings } from '../config';
import type { RocketConfig } from '../config';

/**
 * Simulation - Main physics simulation
 * 
 * N-body orbital physics with CollisionManager for surface handling.
 */
export class Simulation implements ISimulation {
    private bodies: Body[] = [];
    private debris: Debris[] = [];
    private rocket: Rocket | null = null;
    private collisionManager: CollisionManager;

    // Resting state
    private _isRocketResting: boolean = false;
    private _restingOn: Body | null = null;

    // Physics settings
    private readonly MAX_PHYSICS_STEP = Settings.PHYSICS.MAX_STEP;

    // Event handlers
    private collisionHandler?: (bodyA: Body | Rocket, bodyB: Body | Rocket) => void;
    private stageSeparationHandler?: (debris: Debris) => void;

    constructor() {
        this.collisionManager = new CollisionManager();

        // Setup internal collision handler
        this.collisionManager.onCollision = (bodyA, bodyB) => {
            if (this.collisionHandler) {
                this.collisionHandler(bodyA, bodyB);
            }
        };
    }

    /**
     * Initialize the simulation
     */
    init(rocketConfig?: RocketConfig): void {
        console.log('🔧 Simulation initializing');

        // Initialize celestial bodies
        this.bodies = SceneSetup.initBodies(this.collisionManager);

        // Create rocket
        this.rocket = SceneSetup.createRocket(this.bodies, this.collisionManager, rocketConfig);

        // Setup stage separation handler
        if (this.rocket) {
            this.rocket.onStageSeparation = (debris: Debris) => {
                this.bodies.push(debris);
                this.debris.push(debris);
                console.log('Debris added to simulation');

                if (this.stageSeparationHandler) {
                    this.stageSeparationHandler(debris);
                }
            };
        }

        console.log(`🌍 Simulation initialized with ${this.bodies.length} bodies`);
    }

    /**
     * Step the simulation forward
     */
    step(dt: number, timeScale: number, timeWarp: number): void {
        if (!this.rocket) return;

        // Calculate total simulation time
        let totalDt = dt * timeScale * timeWarp;

        // Update rocket controls
        this.rocket.update(dt, totalDt, this.bodies);

        // Sub-stepping for stability
        while (totalDt > 0) {
            const stepDt = Math.min(totalDt, this.MAX_PHYSICS_STEP);

            // Apply N-body physics to all bodies
            Physics.step(this.bodies, stepDt);

            totalDt -= stepDt;
        }

        // Execute deferred fairing ejection
        this.rocket.executePendingEjection();

        // Handle resting state and liftoff
        if (this._isRocketResting && this._restingOn) {
            const throttle = this.rocket.controls.getThrottle();
            if (throttle > 0 && this.rocket.engine.hasFuel()) {
                // Thrust active - cancel resting to allow liftoff
                this._isRocketResting = false;
                this._restingOn = null;
            } else {
                // No thrust - apply contact force to stay on surface
                this.collisionManager.applyContactForce(this.rocket, this._restingOn, dt * timeScale * timeWarp);
            }
        }

        // Prevent rocket from penetrating planets
        const result = this.collisionManager.preventPenetration(this.rocket, this.bodies);
        this._isRocketResting = result.isResting;
        this._restingOn = result.restingOn;

        // Sync positions to Matter.js and check for collisions
        this.collisionManager.syncPositions(this.bodies, this.rocket);
        this.collisionManager.step(dt);

        // Handle debris collisions
        this.handleDebrisCollisions();
    }

    /**
     * Handle debris collisions with planets
     */
    private handleDebrisCollisions(): void {
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            const crashed = this.collisionManager.preventDebrisPenetration(d, this.bodies);

            if (crashed || d.isExpired()) {
                // Remove debris
                const bodyIndex = this.bodies.indexOf(d);
                if (bodyIndex > -1) {
                    this.bodies.splice(bodyIndex, 1);
                }
                this.debris.splice(i, 1);

                if (crashed) {
                    console.log('💥 Debris exploded on impact!');
                } else {
                    console.log('🗑️ Debris expired and removed');
                }
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.collisionManager.dispose();
        this.bodies = [];
        this.debris = [];
        this.rocket = null;
        console.log('🧹 Simulation disposed');
    }

    // ========================================
    // Accessors
    // ========================================

    getRocket(): Rocket | null {
        return this.rocket;
    }

    getBodies(): Body[] {
        return this.bodies;
    }

    getDebris(): Debris[] {
        return this.debris;
    }

    getCollisionManager(): CollisionManager | null {
        return this.collisionManager;
    }

    isRocketResting(): boolean {
        return this._isRocketResting;
    }

    getRestingBody(): Body | null {
        return this._restingOn;
    }

    breakRestingState(): void {
        this._isRocketResting = false;
        this._restingOn = null;
    }

    // ========================================
    // Event handlers
    // ========================================

    setCollisionHandler(handler: (bodyA: Body | Rocket, bodyB: Body | Rocket) => void): void {
        this.collisionHandler = handler;
    }

    setStageSeparationHandler(handler: (debris: Debris) => void): void {
        this.stageSeparationHandler = handler;
    }
}
