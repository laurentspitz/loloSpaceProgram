import Matter from 'matter-js';
import type { ISimulation } from '../ISimulation';
import { Body } from '../../core/Body';
import { Rocket } from '../../entities/Rocket';
import { Debris } from '../../entities/Debris';
import { CollisionManager } from '../../physics/CollisionManager';
import { Vector2 } from '../../core/Vector2';
import type { RocketConfig } from '../../config';

/**
 * SimulationV2 - 100% Matter.js simulation
 * 
 * Minimal implementation for testing:
 * - Earth only (no solar system)
 * - Rocket with thrust
 * - Gravity towards Earth center
 * - Collisions handled by Matter.js
 */
export class SimulationV2 implements ISimulation {
    private engine: Matter.Engine;
    private world: Matter.World;

    // Matter.js bodies
    private earthMatterBody: Matter.Body | null = null;
    private rocketMatterBody: Matter.Body | null = null;

    // Game entities (for compatibility with renderer/UI)
    private rocket: Rocket | null = null;
    private earth: Body | null = null;
    private bodies: Body[] = [];
    private debris: Debris[] = [];

    // Earth parameters
    private readonly EARTH_RADIUS = 6371000; // meters (real radius)
    private readonly VISUAL_SCALE = 3.0;
    private readonly EARTH_VISUAL_RADIUS: number;
    private readonly SURFACE_GRAVITY = 9.81; // m/s²

    // Use LOCAL coordinates centered on Earth (0,0) for V2
    // This avoids floating-point precision issues with Matter.js at huge distances
    private readonly EARTH_POSITION = new Vector2(0, 0);

    // State
    private _isRocketResting: boolean = false;
    private _restingOn: Body | null = null;

    // Event handlers
    private collisionHandler?: (bodyA: Body | Rocket, bodyB: Body | Rocket) => void;
    private stageSeparationHandler?: (debris: Debris) => void;

    constructor() {
        this.EARTH_VISUAL_RADIUS = this.EARTH_RADIUS * this.VISUAL_SCALE;

        // Create Matter.js engine with no global gravity
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 0, scale: 0 }
        });
        this.world = this.engine.world;

        // Better collision detection
        this.engine.positionIterations = 10;
        this.engine.velocityIterations = 10;

        // Setup collision events
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollisionStart(event.pairs);
        });

        Matter.Events.on(this.engine, 'collisionActive', (event) => {
            this.handleCollisionActive(event.pairs);
        });

        Matter.Events.on(this.engine, 'collisionEnd', (event) => {
            this.handleCollisionEnd(event.pairs);
        });

        console.log('🚀 SimulationV2 initialized (100% Matter.js)');
    }

    /**
     * Initialize the simulation
     */
    init(rocketConfig?: RocketConfig): void {
        console.log('🔧 SimulationV2 initializing (Earth only)');

        // Create Earth as a Body for renderer compatibility
        this.earth = new Body(
            'Earth',
            5.972e24, // mass (kg)
            this.EARTH_RADIUS,
            '#4169E1', // Royal blue
            this.EARTH_POSITION.clone(),
            new Vector2(0, 0) // No orbital velocity in V2
        );
        this.bodies.push(this.earth);

        // Create Earth Matter.js body (static)
        this.earthMatterBody = Matter.Bodies.circle(
            this.EARTH_POSITION.x,
            this.EARTH_POSITION.y,
            this.EARTH_VISUAL_RADIUS,
            {
                isStatic: true,
                restitution: 0.3,
                friction: 0.9,
                frictionStatic: 0.95,
                label: 'Earth'
            }
        );
        Matter.World.add(this.world, this.earthMatterBody);

        // Create rocket
        this.rocket = new Rocket(
            new Vector2(0, 0), // Will be positioned below
            new Vector2(0, 0),
            rocketConfig
        );

        // Position rocket on Earth's surface
        // Use a larger offset to ensure rocket is clearly above surface
        const rocketHeight = this.rocket.getTotalHeight() || 20;
        const launchAngle = Math.PI / 2; // Top of Earth (Y+ direction)
        const surfaceOffset = rocketHeight / 2 + 50; // Half rocket height + generous buffer

        // Calculate position relative to Earth
        const offsetX = Math.cos(launchAngle) * (this.EARTH_VISUAL_RADIUS + surfaceOffset);
        const offsetY = Math.sin(launchAngle) * (this.EARTH_VISUAL_RADIUS + surfaceOffset);
        const rocketPos = this.EARTH_POSITION.add(new Vector2(offsetX, offsetY));

        this.rocket.body.position = rocketPos;
        this.rocket.body.velocity = new Vector2(0, 0);
        this.bodies.push(this.rocket.body);

        // Create rocket Matter.js body
        this.rocketMatterBody = Matter.Bodies.rectangle(
            rocketPos.x,
            rocketPos.y,
            this.rocket.width || 5,
            rocketHeight,
            {
                isStatic: false,
                restitution: 0.2,
                friction: 0.8,
                frictionStatic: 0.9,
                density: 0.001,
                label: 'Rocket'
            }
        );
        Matter.World.add(this.world, this.rocketMatterBody);

        // Start rocket as resting on surface (prevents immediate fall)
        this._isRocketResting = true;
        this._restingOn = this.earth;

        // Setup stage separation (simplified - just log for now)
        this.rocket.onStageSeparation = (debris: Debris) => {
            console.log('[V2] Stage separation - debris handling not implemented yet');
            if (this.stageSeparationHandler) {
                this.stageSeparationHandler(debris);
            }
        };

        const altitude = offsetY - this.EARTH_VISUAL_RADIUS;
        console.log(`🌍 Earth at (${this.EARTH_POSITION.x.toExponential(2)}, ${this.EARTH_POSITION.y})`);
        console.log(`🚀 Rocket at (${rocketPos.x.toExponential(2)}, ${rocketPos.y.toExponential(2)})`);
        console.log(`📏 Earth visual radius: ${this.EARTH_VISUAL_RADIUS.toExponential(2)}m`);
        console.log(`🛫 Rocket altitude: ${altitude.toFixed(0)}m (should be ${surfaceOffset.toFixed(0)}m)`);
    }

    /**
     * Step the simulation
     */
    step(dt: number, timeScale: number, timeWarp: number): void {
        if (!this.rocket || !this.rocketMatterBody || !this.earthMatterBody) return;

        const scaledDt = dt * timeScale * timeWarp;

        // Update rocket controls
        this.rocket.update(dt, scaledDt, this.bodies);

        // If resting and no throttle, don't apply gravity (cancellation)
        const throttle = this.rocket.controls.getThrottle();
        const hasThrust = throttle > 0 && this.rocket.engine.hasFuel();

        if (this._isRocketResting && !hasThrust) {
            // Rocket is resting - keep it static, don't apply gravity
            Matter.Body.setVelocity(this.rocketMatterBody, { x: 0, y: 0 });
        } else {
            // Not resting or has thrust - apply gravity
            this.applyGravity();

            // Apply rocket thrust
            if (hasThrust) {
                this.applyThrust(scaledDt);
                // Break resting state
                if (this._isRocketResting) {
                    this._isRocketResting = false;
                    this._restingOn = null;
                    console.log('🚀 Liftoff initiated!');
                }
            }
        }

        // Step Matter.js with substeps to avoid delta warning (max 16.67ms per step)
        const msDt = dt * 1000;
        const maxStep = 16.67;
        let remaining = msDt;

        while (remaining > 0) {
            const stepMs = Math.min(remaining, maxStep);
            Matter.Engine.update(this.engine, stepMs);
            remaining -= stepMs;
        }

        // Sync Matter.js state back to game entities
        this.syncFromMatter();

        // Debug logging
        if (Math.random() < 0.02) {
            const alt = this.getAltitude();
            const vel = this.rocket.body.velocity.mag();
            console.log(`[V2] Alt: ${alt.toFixed(0)}m, Vel: ${vel.toFixed(1)}m/s, Resting: ${this._isRocketResting}`);
        }
    }

    /**
     * Apply gravity towards Earth center
     */
    private applyGravity(): void {
        if (!this.rocketMatterBody || !this.earthMatterBody) return;

        const dx = this.earthMatterBody.position.x - this.rocketMatterBody.position.x;
        const dy = this.earthMatterBody.position.y - this.rocketMatterBody.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) return;

        const nx = dx / dist;
        const ny = dy / dist;

        // Gravity: g = g0 * (R / dist)^2
        const gravityMultiplier = Math.pow(this.EARTH_VISUAL_RADIUS / dist, 2);
        const gravity = this.SURFACE_GRAVITY * gravityMultiplier;

        const mass = this.rocketMatterBody.mass;
        const forceX = nx * gravity * mass;
        const forceY = ny * gravity * mass;

        Matter.Body.applyForce(this.rocketMatterBody, this.rocketMatterBody.position, {
            x: forceX,
            y: forceY
        });
    }

    /**
     * Apply rocket thrust
     */
    private applyThrust(scaledDt: number): void {
        if (!this.rocketMatterBody || !this.rocket) return;

        const throttle = this.rocket.controls.getThrottle();
        if (throttle <= 0) return;
        if (!this.rocket.engine.hasFuel()) return;

        const thrustMagnitude = this.rocket.engine.getThrust(throttle);

        // Thrust direction based on rocket rotation
        const angle = this.rocketMatterBody.angle - Math.PI / 2;
        const thrustX = Math.cos(angle) * thrustMagnitude * scaledDt;
        const thrustY = Math.sin(angle) * thrustMagnitude * scaledDt;

        Matter.Body.applyForce(this.rocketMatterBody, this.rocketMatterBody.position, {
            x: thrustX,
            y: thrustY
        });
        // Resting state break is handled in step()
    }

    /**
     * Sync Matter.js state to game entities
     */
    private syncFromMatter(): void {
        if (!this.rocketMatterBody || !this.rocket) return;

        // Update rocket position
        this.rocket.body.position.x = this.rocketMatterBody.position.x;
        this.rocket.body.position.y = this.rocketMatterBody.position.y;

        // Update rocket velocity
        this.rocket.body.velocity.x = this.rocketMatterBody.velocity.x;
        this.rocket.body.velocity.y = this.rocketMatterBody.velocity.y;

        // Update rotation
        this.rocket.rotation = this.rocketMatterBody.angle;
    }

    /**
     * Get altitude above Earth surface
     */
    private getAltitude(): number {
        if (!this.rocketMatterBody || !this.earthMatterBody) return 0;

        const dx = this.rocketMatterBody.position.x - this.earthMatterBody.position.x;
        const dy = this.rocketMatterBody.position.y - this.earthMatterBody.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist - this.EARTH_VISUAL_RADIUS;
    }

    // ========================================
    // Collision event handlers
    // ========================================

    private handleCollisionStart(pairs: Matter.Pair[]): void {
        for (const pair of pairs) {
            if (this.isRocketEarthCollision(pair)) {
                const impactSpeed = this.getImpactSpeed();

                if (impactSpeed < 5) {
                    console.log('✅ Soft landing!', impactSpeed.toFixed(1), 'm/s');
                    this._isRocketResting = true;
                    this._restingOn = this.earth;
                } else if (impactSpeed < 50) {
                    console.log('⚠️ Hard landing!', impactSpeed.toFixed(1), 'm/s');
                } else {
                    console.log('💥 CRASH!', impactSpeed.toFixed(1), 'm/s');
                }

                if (this.collisionHandler && this.rocket && this.earth) {
                    this.collisionHandler(this.rocket, this.earth);
                }
            }
        }
    }

    private handleCollisionActive(pairs: Matter.Pair[]): void {
        for (const pair of pairs) {
            if (this.isRocketEarthCollision(pair)) {
                const speed = this.getImpactSpeed();
                if (speed < 2) {
                    this._isRocketResting = true;
                    this._restingOn = this.earth;
                }
            }
        }
    }

    private handleCollisionEnd(pairs: Matter.Pair[]): void {
        for (const pair of pairs) {
            if (this.isRocketEarthCollision(pair)) {
                this._isRocketResting = false;
                this._restingOn = null;
                console.log('🚀 Liftoff!');
            }
        }
    }

    private isRocketEarthCollision(pair: Matter.Pair): boolean {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        return labels.includes('Rocket') && labels.includes('Earth');
    }

    private getImpactSpeed(): number {
        if (!this.rocketMatterBody) return 0;
        const vel = this.rocketMatterBody.velocity;
        return Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    }

    // ========================================
    // ISimulation implementation
    // ========================================

    dispose(): void {
        Matter.World.clear(this.world, false);
        Matter.Engine.clear(this.engine);
        this.bodies = [];
        this.debris = [];
        this.rocket = null;
        this.earth = null;
        console.log('🧹 SimulationV2 disposed');
    }

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
        // V2 doesn't use CollisionManager
        return null;
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

    setCollisionHandler(handler: (bodyA: Body | Rocket, bodyB: Body | Rocket) => void): void {
        this.collisionHandler = handler;
    }

    setStageSeparationHandler(handler: (debris: Debris) => void): void {
        this.stageSeparationHandler = handler;
    }
}
