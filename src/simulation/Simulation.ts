import type { ISimulation } from './ISimulation';
import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';
import { Debris } from '../entities/Debris';
import { Physics } from '../physics/Physics';
import { CollisionManager, type FloorDebugInfo } from '../physics/CollisionManager';
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
    private _floorInfo: FloorDebugInfo | null = null;

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

        // DEBUG: Track velocity changes
        const velBefore = this.rocket.body.velocity.mag();

        // Update rocket controls
        this.rocket.update(dt, totalDt, this.bodies);
        const velAfterRocket = this.rocket.body.velocity.mag();

        // Sub-stepping for stability
        while (totalDt > 0) {
            const stepDt = Math.min(totalDt, this.MAX_PHYSICS_STEP);

            // Apply N-body physics to all bodies
            Physics.step(this.bodies, stepDt);

            totalDt -= stepDt;
        }
        const velAfterPhysics = this.rocket.body.velocity.mag();

        // Execute deferred fairing ejection
        this.rocket.executePendingEjection();

        // Handle resting state and liftoff
        if (this._isRocketResting && this._restingOn) {
            const throttle = this.rocket.controls.getThrottle();
            if (throttle > 0 && this.rocket.engine.hasFuel()) {
                // Thrust active - cancel resting to allow liftoff
                console.log(`🚀 LIFTOFF! Breaking resting state, throttle=${throttle}`);
                this._isRocketResting = false;
                this._restingOn = null;
            }
            // OBB collision handles keeping rocket on surface
        }

        // Prevent rocket from penetrating planets using OBB collision
        // Find the nearest body (planet)
        let nearestBody: Body | null = null;
        let minDist = Infinity;
        for (const body of this.bodies) {
            if (body.name === 'Rocket') continue;
            const dist = this.rocket.body.position.distanceTo(body.position);
            if (dist < minDist) {
                minDist = dist;
                nearestBody = body;
            }
        }

        // Get floor info for debug visualization
        this._floorInfo = this.collisionManager.getFloorInfo(this.rocket, nearestBody);

        if (nearestBody) {
            // Use OBB collision detection and response
            const collisionResult = this.collisionManager.detectAndRespondCollision(this.rocket, nearestBody);
            this._isRocketResting = collisionResult.isResting;
            this._restingOn = collisionResult.restingOn;
        } else {
            this._isRocketResting = false;
            this._restingOn = null;
        }
        const velAfterCollision = this.rocket.body.velocity.mag();

        // DEBUG: Log velocity changes (always log when low velocity for debugging)
        if (velBefore < 50) {
            console.log(`VEL: ${velBefore.toFixed(1)} → R:${velAfterRocket.toFixed(1)} → P:${velAfterPhysics.toFixed(1)} → C:${velAfterCollision.toFixed(1)}`);
        }

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

    getFloorInfo(): FloorDebugInfo | null {
        return this._floorInfo;
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
