import Matter from 'matter-js';
import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';
import { Vector2 } from '../core/Vector2';

/**
 * CollisionManager - Manages Matter.js physics engine for local collisions
 * 
 * Architecture:
 * - N-body system handles gravity and orbits (long-range)
 * - Matter.js handles collisions and rebounds (short-range)
 * - Systems are synchronized each frame
 */
export class CollisionManager {
    private engine: Matter.Engine;
    private world: Matter.World;

    // Map our bodies to Matter bodies
    private bodyMap: Map<Body | Rocket, Matter.Body> = new Map();

    // Collision event handlers
    public onCollision?: (bodyA: Body | Rocket, bodyB: Body | Rocket) => void;

    constructor() {
        // Create Matter.js engine with no gravity (we handle that)
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 0, scale: 0 }
        });
        this.world = this.engine.world;

        // Listen for collision events
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollisions(event.pairs);
        });
    }

    /**
     * Create or update Matter body for a celestial body (planet/moon)
     */
    createCelestialBody(body: Body, visualScale: number = 3.0): void {
        const visualRadius = body.radius * visualScale;

        // Create or update Matter body
        let matterBody = this.bodyMap.get(body);

        if (!matterBody) {
            matterBody = Matter.Bodies.circle(
                body.position.x,
                body.position.y,
                visualRadius,
                {
                    isStatic: true, // Planets don't move in Matter.js (we handle that)
                    restitution: 0.3, // Some bounce
                    friction: 0.9,
                    label: body.name
                }
            );

            Matter.World.add(this.world, matterBody);
            this.bodyMap.set(body, matterBody);
            body.matterBody = matterBody;
        }
    }

    /**
     * Create or update Matter body for rocket (rectangle)
     */
    createRocketBody(rocket: Rocket): void {
        let matterBody = this.bodyMap.get(rocket);

        if (!matterBody) {
            const width = rocket.width;
            const height = rocket.getTotalHeight();

            matterBody = Matter.Bodies.rectangle(
                rocket.body.position.x,
                rocket.body.position.y,
                width,
                height,
                {
                    isStatic: false, // Rocket is dynamic
                    restitution: 0.2, // Small bounce
                    friction: 0.8,
                    density: 0.001, // Light (doesn't affect our physics)
                    label: 'Rocket'
                }
            );

            Matter.World.add(this.world, matterBody);
            this.bodyMap.set(rocket, matterBody);
            rocket.body.matterBody = matterBody;
        }
    }

    /**
     * Sync positions from our physics to Matter.js
     * Called every frame before stepping Matter engine
     */
    syncPositions(bodies: Body[], rocket: Rocket | null): void {
        // Sync celestial bodies
        bodies.forEach(body => {
            const matterBody = this.bodyMap.get(body);
            if (matterBody) {
                Matter.Body.setPosition(matterBody, {
                    x: body.position.x,
                    y: body.position.y
                });
            }
        });

        // Sync rocket
        if (rocket) {
            const matterBody = this.bodyMap.get(rocket);
            if (matterBody) {
                Matter.Body.setPosition(matterBody, {
                    x: rocket.body.position.x,
                    y: rocket.body.position.y
                });
                Matter.Body.setAngle(matterBody, rocket.rotation);
            }
        }
    }

    /**
     * Step the Matter.js physics engine
     */
    step(deltaTime: number): void {
        // Convert to milliseconds (Matter.js expects ms)
        Matter.Engine.update(this.engine, deltaTime * 1000);
    }

    /**
     * Handle collision events
     */
    private handleCollisions(pairs: Matter.Pair[]): void {
        pairs.forEach(pair => {
            // Find our bodies from Matter bodies
            let bodyA: Body | Rocket | undefined;
            let bodyB: Body | Rocket | undefined;

            this.bodyMap.forEach((matterBody, ourBody) => {
                if (matterBody === pair.bodyA) bodyA = ourBody;
                if (matterBody === pair.bodyB) bodyB = ourBody;
            });

            if (bodyA && bodyB && this.onCollision) {
                this.onCollision(bodyA, bodyB);
            }
        });
    }

    /**
     * Get collision velocity for bounce calculation
     */
    getCollisionImpact(body: Body | Rocket): number {
        const matterBody = this.bodyMap.get(body);
        if (!matterBody) return 0;

        const vel = matterBody.velocity;
        return Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    }

    /**
     * Apply bounce from Matter.js back to our physics
     */
    applyBounce(rocket: Rocket): void {
        const matterBody = this.bodyMap.get(rocket);
        if (!matterBody) return;

        // Get velocity from Matter.js collision response
        const vel = matterBody.velocity;

        // Replace velocity (not add) to ensure rocket bounces away
        rocket.body.velocity.x = vel.x;
        rocket.body.velocity.y = vel.y;
    }

    /**
     * Check if rocket is penetrating a planet and push it out
     */
    correctPenetration(rocket: Rocket, planet: Body, visualScale: number = 3.0): void {
        const visualRadius = planet.radius * visualScale;
        const dist = rocket.body.position.distanceTo(planet.position);
        const minDist = visualRadius + rocket.body.radius;

        if (dist < minDist) {
            // Rocket is inside planet - push it out
            const penetration = minDist - dist;
            const direction = rocket.body.position.sub(planet.position).normalize();

            // Move rocket to surface
            rocket.body.position = planet.position.add(direction.scale(minDist));

            // Add outward velocity to prevent re-penetration
            const bounceSpeed = Math.max(10, penetration * 0.1); // Proportional to penetration
            rocket.body.velocity = rocket.body.velocity.add(direction.scale(bounceSpeed));
        }
    }

    /**
     * Prevent rocket from penetrating any planet surface
     * Called every frame to enforce surface boundary
     */
    preventPenetration(rocket: Rocket, bodies: Body[]): { isResting: boolean, restingOn: Body | null } {
        const VISUAL_SCALE = 3.0;
        let isResting = false;
        let restingOn: Body | null = null;

        // Check all bodies for potential penetration
        bodies.forEach(body => {
            if (body === rocket.body) return; // Skip rocket itself

            const visualRadius = body.radius * VISUAL_SCALE;
            const rocketHalfHeight = rocket.getTotalHeight() / 2;
            const contactDist = visualRadius + rocketHalfHeight;

            const dist = rocket.body.position.distanceTo(body.position);

            if (dist < contactDist + 1.0) { // +1m threshold to detect near-surface
                // Rocket is near or penetrating surface
                const direction = rocket.body.position.sub(body.position).normalize();

                // Push rocket to exact surface position
                rocket.body.position = body.position.add(direction.scale(contactDist));

                // Calculate velocity relative to planet
                const relVel = rocket.body.velocity.sub(body.velocity);
                const normalVel = relVel.x * direction.x + relVel.y * direction.y; // dot product

                if (normalVel < 0) {
                    // Rocket is moving towards planet
                    const restitution = 0.3; // Bounciness (30% energy conserved)
                    const friction = 0.8; // Surface friction coefficient
                    const restThreshold = 5.0; // Below 5 m/s, stop bouncing (m/s)

                    // 1. Calculate normal component (perpendicular to surface)
                    const normalComponent = direction.scale(normalVel);
                    const normalSpeed = Math.abs(normalVel);

                    // 2. Calculate tangential component (parallel to surface)
                    const tangentialVel = relVel.sub(normalComponent);
                    const tangentialSpeed = tangentialVel.mag();

                    // 3. Apply friction to tangential velocity
                    let frictionForce = new Vector2(0, 0);
                    if (tangentialSpeed > 0.1) { // Only apply if sliding
                        const frictionMagnitude = Math.min(tangentialSpeed * friction, tangentialSpeed);
                        const tangentialDirection = tangentialVel.scale(1 / tangentialSpeed);
                        frictionForce = tangentialDirection.scale(-frictionMagnitude);
                    }

                    // 4. Determine if rocket should rest or bounce
                    if (normalSpeed < restThreshold && tangentialSpeed < restThreshold) {
                        // Velocity too low - rocket rests on surface
                        rocket.body.velocity = body.velocity.clone();
                        isResting = true;
                        restingOn = body;
                    } else if (normalSpeed < restThreshold) {
                        // Normal speed low but still sliding - no bounce, just friction
                        const bounceVelocity = body.velocity
                            .add(tangentialVel)
                            .add(frictionForce);
                        rocket.body.velocity = bounceVelocity;
                    } else {
                        // Normal bounce with friction
                        const bounceVelocity = body.velocity
                            .add(tangentialVel)
                            .add(frictionForce)
                            .sub(normalComponent.scale(restitution));
                        rocket.body.velocity = bounceVelocity;
                    }
                }
            }
        });

        return { isResting, restingOn };
    }

    /**
     * Apply normal contact force to cancel gravity when resting on surface
     */
    applyContactForce(rocket: Rocket, planet: Body, deltaTime: number): void {
        // Calculate gravitational acceleration towards planet
        const r = rocket.body.position.distanceTo(planet.position);
        const g = (6.674e-11 * planet.mass) / (r * r);

        // Direction from planet to rocket
        const direction = rocket.body.position.sub(planet.position).normalize();

        // Apply normal force (opposite to gravity) to cancel it
        const normalForce = direction.scale(g * deltaTime);
        rocket.body.velocity = rocket.body.velocity.add(normalForce);

        // Also maintain exact surface position
        const VISUAL_SCALE = 3.0;
        const visualRadius = planet.radius * VISUAL_SCALE;
        const rocketHalfHeight = rocket.getTotalHeight() / 2;
        const contactDist = visualRadius + rocketHalfHeight;
        rocket.body.position = planet.position.add(direction.scale(contactDist));
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        Matter.World.clear(this.world, false);
        Matter.Engine.clear(this.engine);
        this.bodyMap.clear();
    }
}
