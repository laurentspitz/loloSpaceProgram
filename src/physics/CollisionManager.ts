import Matter from 'matter-js';
import { Body } from '../core/Body';
import { Rocket } from '../entities/Rocket';
import { Debris } from '../entities/Debris';
import { Vector2 } from '../core/Vector2';

/**
 * Debug info for floor visualization
 */
export interface FloorDebugInfo {
    start: Vector2;
    end: Vector2;
    normal: Vector2;
    surfacePoint: Vector2;
}

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

    // Visual scale for collision consistency
    private readonly VISUAL_SCALE = 1.0; // No visual scaling - physics = rendering

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
    createCelestialBody(body: Body, visualScale: number = 1.0): void {
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
    correctPenetration(rocket: Rocket, planet: Body, visualScale: number = 1.0): void {
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
     * Uses local floor approach: calculates altitude above surface and treats it as a floor collision.
     * This avoids numerical precision issues with large planet radii.
     */
    preventPenetration(rocket: Rocket, bodies: Body[]): { isResting: boolean, restingOn: Body | null, floorInfo: FloorDebugInfo | null } {
        let isResting = false;
        let restingOn: Body | null = null;
        let floorInfo: FloorDebugInfo | null = null;

        // Find the nearest body (the one we might collide with)
        let nearestBody: Body | null = null;
        let minDist = Infinity;

        for (const body of bodies) {
            if (body === rocket.body) continue;
            if (body.name === 'Debris') continue;

            const dist = rocket.body.position.distanceTo(body.position);
            if (dist < minDist) {
                minDist = dist;
                nearestBody = body;
            }
        }

        if (!nearestBody) {
            return { isResting, restingOn, floorInfo };
        }

        // Calculate altitude above surface (local floor approach)
        const planetRadius = nearestBody.radius * this.VISUAL_SCALE;
        const rocketHalfHeight = rocket.body.radius; // Rocket's collision radius (half height)
        const altitude = minDist - planetRadius; // Height above surface

        // Direction from planet center to rocket (surface normal)
        const surfaceNormal = rocket.body.position.sub(nearestBody.position).normalize();

        // Floor debug info (surface point + tangent line)
        const surfacePoint = nearestBody.position.add(surfaceNormal.scale(planetRadius));
        const tangent = new Vector2(-surfaceNormal.y, surfaceNormal.x); // Perpendicular
        const floorWidth = 500; // 500m wide debug line
        floorInfo = {
            start: surfacePoint.add(tangent.scale(-floorWidth)),
            end: surfacePoint.add(tangent.scale(floorWidth)),
            normal: surfaceNormal,
            surfacePoint: surfacePoint
        };

        // Check if rocket is at or below floor level
        if (altitude < rocketHalfHeight + 1.0) { // +1m threshold
            // Calculate velocity relative to planet
            const relVel = rocket.body.velocity.sub(nearestBody.velocity);
            // Velocity component along surface normal (positive = moving away, negative = moving towards)
            const normalVel = relVel.dot(surfaceNormal);

            // Is rocket below floor?
            const isPenetrating = altitude < rocketHalfHeight;

            if (isPenetrating) {
                // Push rocket up to floor level
                const correctAltitude = rocketHalfHeight;
                rocket.body.position = nearestBody.position.add(surfaceNormal.scale(planetRadius + correctAltitude));
            }

            // Apply collision physics if moving towards surface
            if (normalVel < 0 || isPenetrating) {
                const restitution = 0.3; // Bounciness (30% energy conserved)
                const friction = 0.8; // Surface friction
                const restThreshold = 5.0; // Below 5 m/s, stop bouncing

                // Decompose velocity into normal and tangential
                const normalComponent = surfaceNormal.scale(normalVel);
                const normalSpeed = Math.abs(normalVel);
                const tangentialVel = relVel.sub(normalComponent);
                const tangentialSpeed = tangentialVel.mag();

                // Apply friction to tangential velocity
                let adjustedTangentialVel = tangentialVel;
                if (tangentialSpeed > 0.1) {
                    const frictionFactor = Math.max(0, 1 - friction);
                    adjustedTangentialVel = tangentialVel.scale(frictionFactor);
                }

                // Check if thrusting (don't rest if trying to liftoff)
                const throttle = rocket.controls.getThrottle();
                const hasFuel = rocket.engine.hasFuel();
                const isThrusting = throttle > 0 && hasFuel;

                if (normalSpeed < restThreshold && tangentialSpeed < restThreshold && !isThrusting) {
                    // Rocket rests on surface
                    rocket.body.velocity = nearestBody.velocity.clone();
                    isResting = true;
                    restingOn = nearestBody;
                } else if (normalSpeed < restThreshold) {
                    // Sliding on surface
                    rocket.body.velocity = nearestBody.velocity.add(adjustedTangentialVel);
                } else {
                    // Bounce! Reflect normal component with restitution
                    const bounceNormal = surfaceNormal.scale(normalSpeed * restitution);
                    rocket.body.velocity = nearestBody.velocity.add(adjustedTangentialVel).add(bounceNormal);
                }
            }
        }

        return { isResting, restingOn, floorInfo };
    }

    /**
     * Prevent debris from penetrating planet surface
     * Returns true if debris crashed (high speed impact)
     */
    preventDebrisPenetration(debris: Debris, bodies: Body[]): boolean {
        let crashed = false;

        bodies.forEach(body => {
            if (body === debris) return;
            if (body instanceof Rocket) return; // Ignore rocket collision
            if (body instanceof Debris) return; // Ignore other debris collision
            if (body.name === 'Rocket') return; // Ignore rocket.body (which is a Body, not Rocket)

            const visualRadius = body.radius * this.VISUAL_SCALE;
            // Use debris's actual radius (based on part width)
            const debrisRadius = debris.radius * this.VISUAL_SCALE;
            const contactDist = visualRadius + debrisRadius;

            const dist = debris.position.distanceTo(body.position);

            // Safety check for NaN or zero distance
            if (isNaN(dist) || dist < 0.1) return;

            if (dist < contactDist) {
                // Collision!
                const direction = debris.position.sub(body.position).normalize();

                // Push out
                debris.position = body.position.add(direction.scale(contactDist));

                // Calculate impact velocity
                const relVel = debris.velocity.sub(body.velocity);
                const normalVel = relVel.x * direction.x + relVel.y * direction.y;

                if (normalVel < 0) {
                    // Moving towards planet
                    const impactSpeed = Math.abs(normalVel);
                    const CRASH_THRESHOLD = 5; // m/s (Debris are fragile)

                    if (impactSpeed > CRASH_THRESHOLD) {
                        crashed = true;
                    } else {
                        // Bounce
                        const restitution = 0.5;
                        const friction = 0.8;

                        const normalComponent = direction.scale(normalVel);
                        const tangentialVel = relVel.sub(normalComponent);

                        // Apply friction
                        const tangentialSpeed = tangentialVel.mag();
                        let frictionForce = new Vector2(0, 0);
                        if (tangentialSpeed > 0.1) {
                            const frictionMagnitude = Math.min(tangentialSpeed * friction, tangentialSpeed);
                            const tangentialDirection = tangentialVel.scale(1 / tangentialSpeed);
                            frictionForce = tangentialDirection.scale(-frictionMagnitude);
                        }

                        const bounceVelocity = body.velocity
                            .add(tangentialVel)
                            .add(frictionForce)
                            .sub(normalComponent.scale(restitution));

                        debris.velocity = bounceVelocity;

                        // Add some random rotation on bounce
                        debris.angularVelocity += (Math.random() - 0.5) * 5;
                    }
                }
            }
        });

        return crashed;
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
        const visualRadius = planet.radius * this.VISUAL_SCALE;
        const rocketHalfHeight = rocket.body.radius * this.VISUAL_SCALE;
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
