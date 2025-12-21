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
 * - Local ground body created tangent to nearest planet surface
 * - Systems are synchronized each frame
 */
export class CollisionManager {
    private engine: Matter.Engine;
    private world: Matter.World;

    // Map our bodies to Matter bodies
    private bodyMap: Map<Body | Rocket, Matter.Body> = new Map();

    // Local ground body for collision with nearby planet
    private groundBody: Matter.Body | null = null;
    private groundWidth = 2000; // 2km wide ground
    private groundHeight = 100; // 100m thick ground

    // Visual scale for collision consistency
    private readonly VISUAL_SCALE = 1.0; // No visual scaling - physics = rendering

    // Collision event handlers
    public onCollision?: (bodyA: Body | Rocket, bodyB: Body | Rocket) => void;

    // Flag to indicate if Matter.js should control rocket physics
    public useMatterPhysics: boolean = false;

    constructor() {
        // Create Matter.js engine with no gravity (we handle that externally)
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 0, scale: 0 }
        });
        this.world = this.engine.world;

        // Create ground body (will be positioned dynamically)
        this.groundBody = Matter.Bodies.rectangle(
            0, 0,
            this.groundWidth, this.groundHeight,
            {
                isStatic: true,
                label: 'Ground',
                friction: 0.9,
                restitution: 0 // No bounce
            }
        );
        Matter.World.add(this.world, this.groundBody);

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
                    restitution: 0, // NO bounce - collision physics handled by custom OBB
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
                    restitution: 0, // No bounce
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

                // Also sync velocity so Matter.js knows how fast we're moving
                Matter.Body.setVelocity(matterBody, {
                    x: rocket.body.velocity.x,
                    y: rocket.body.velocity.y
                });
                Matter.Body.setAngularVelocity(matterBody, rocket.angularVelocity || 0);
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
     * Update the local ground body to be tangent to the nearest planet surface
     * This should be called every frame when the rocket is near a planet
     */
    updateLocalGround(rocket: Rocket, nearestBody: Body): void {
        if (!this.groundBody) return;

        const planetRadius = nearestBody.radius * this.VISUAL_SCALE;

        // Direction from planet center to rocket
        const direction = rocket.body.position.sub(nearestBody.position).normalize();

        // Ground center is slightly below surface (half the ground height down)
        const groundCenter = nearestBody.position.add(direction.scale(planetRadius - this.groundHeight / 2));

        // Angle of the ground (perpendicular to direction, so tangent to surface)
        // direction points up from planet center, so ground should be rotated accordingly
        const groundAngle = Math.atan2(direction.y, direction.x) - Math.PI / 2;

        // Position and rotate the ground body
        Matter.Body.setPosition(this.groundBody, {
            x: groundCenter.x,
            y: groundCenter.y
        });
        Matter.Body.setAngle(this.groundBody, groundAngle);
    }

    /**
     * Custom OBB (Oriented Bounding Box) collision detection
     * Calculates rocket corners based on rotation and finds lowest point relative to surface
     */
    detectAndRespondCollision(rocket: Rocket, nearestBody: Body): { isResting: boolean, restingOn: Body | null } {
        const planetRadius = nearestBody.radius * this.VISUAL_SCALE;
        const rocketHalfHeight = rocket.getTotalHeight() / 2;
        const rocketHalfWidth = rocket.getTotalWidth() / 2;

        // Rocket orientation vectors (based on rocket.rotation)
        const cosR = Math.cos(rocket.rotation);
        const sinR = Math.sin(rocket.rotation);
        const rocketUp = new Vector2(cosR, sinR);       // Nose direction
        const rocketRight = new Vector2(-sinR, cosR);   // Perpendicular to nose

        // Calculate 4 corners of the rocket in world space
        const corners = [
            rocket.body.position.add(rocketUp.scale(-rocketHalfHeight)).add(rocketRight.scale(-rocketHalfWidth)),
            rocket.body.position.add(rocketUp.scale(-rocketHalfHeight)).add(rocketRight.scale(rocketHalfWidth)),
            rocket.body.position.add(rocketUp.scale(rocketHalfHeight)).add(rocketRight.scale(-rocketHalfWidth)),
            rocket.body.position.add(rocketUp.scale(rocketHalfHeight)).add(rocketRight.scale(rocketHalfWidth)),
        ];

        // Center of the rocket base (midpoint of bottom two corners)
        // This gives a stable contact point that doesn't jump around
        const baseCenter = new Vector2(
            (corners[0].x + corners[1].x) / 2,
            (corners[0].y + corners[1].y) / 2
        );

        // Find the lowest altitude of any corner for collision detection
        let lowestAltitude = Infinity;
        for (const corner of corners) {
            const cornerDist = corner.distanceTo(nearestBody.position);
            const cornerAltitude = cornerDist - planetRadius;
            if (cornerAltitude < lowestAltitude) {
                lowestAltitude = cornerAltitude;
            }
        }

        // Use baseCenter as the contact point (stable, doesn't jump)
        let lowestCorner = baseCenter;

        // Check if any part of rocket is at or below surface level
        if (lowestAltitude >= 0.1) { // Increased threshold for stable detection
            // No collision
            return { isResting: false, restingOn: null };
        }

        // === COLLISION DETECTED ===
        // Use surface normal (radial direction from planet center) for consistent behavior
        // This treats the ground as flat regardless of which corner touched first
        const surfaceNormal = rocket.body.position.sub(nearestBody.position).normalize();
        const penetrationDepth = Math.abs(lowestAltitude);

        // Vector from rocket center to contact point
        const contactOffset = lowestCorner.sub(rocket.body.position);

        // STEP 1: Push rocket out of ground by penetration depth
        if (penetrationDepth > 0) {
            const correction = surfaceNormal.scale(penetrationDepth + 0.001); // Almost zero margin
            rocket.body.position = rocket.body.position.add(correction);

            // IMPORTANT: Update lowestCorner to match new position (it moves with rocket)
            lowestCorner = lowestCorner.add(correction);

            // Also update all corners for later use
            for (let i = 0; i < corners.length; i++) {
                corners[i] = corners[i].add(correction);
            }
        }

        // STEP 2: Apply velocity response with torque
        const relVel = rocket.body.velocity.sub(nearestBody.velocity);
        const normalVel = relVel.dot(surfaceNormal);

        if (normalVel < 0) {
            // Remove velocity going into ground + small bounce
            const restitution = 0.3; // 30% of impact velocity bounces back
            const impulse = surfaceNormal.scale(-normalVel * (1 + restitution));
            rocket.body.velocity = rocket.body.velocity.add(impulse);

            // Apply higher friction for better ground grip
            const tangentialVel = relVel.sub(surfaceNormal.scale(normalVel));
            const friction = 0.8; // Increased from 0.5 for less sliding
            rocket.body.velocity = rocket.body.velocity.sub(tangentialVel.scale(friction));

            // TORQUE: Impulse at contact point creates rotation (reduced for gentler landing)
            const torque = contactOffset.x * impulse.y - contactOffset.y * impulse.x;
            const angularImpulse = torque * 0.00002;
            // Only apply if significant (prevents micro-rotation at perfect vertical landing)
            if (Math.abs(angularImpulse) > 0.0001) {
                rocket.angularVelocity = (rocket.angularVelocity || 0) + angularImpulse;
            }
        }

        // STEP 3: Check for tipping - is CoG above support base?
        // Only check when rocket is moving slowly (not during initial impact)
        const speedForTipping = rocket.body.velocity.sub(nearestBody.velocity).mag();

        if (speedForTipping < 20) { // Only check tipping when slow
            const surfaceTangent = new Vector2(-surfaceNormal.y, surfaceNormal.x);
            const contactCorners: Vector2[] = [];

            for (const corner of corners) {
                const cornerDist = corner.distanceTo(nearestBody.position);
                const cornerAlt = cornerDist - planetRadius;
                if (cornerAlt < 0.5) { // Within 0.5m of ground = in contact
                    contactCorners.push(corner);
                }
            }

            if (contactCorners.length > 0) {
                // Find support base range along tangent
                const tangentPositions = contactCorners.map(c =>
                    c.sub(nearestBody.position).dot(surfaceTangent)
                );
                const minTangent = Math.min(...tangentPositions);
                const maxTangent = Math.max(...tangentPositions);

                // CoG position along tangent
                const cogTangentPos = rocket.body.position.sub(nearestBody.position).dot(surfaceTangent);

                // Is CoG outside support base?
                const isStable = cogTangentPos >= minTangent && cogTangentPos <= maxTangent;

                if (!isStable) {
                    // Apply tipping torque (small value for stability)
                    const tipDirection = cogTangentPos < minTangent ? -1 : 1;
                    const tippingTorque = tipDirection * 0.001;
                    rocket.angularVelocity = (rocket.angularVelocity || 0) + tippingTorque;
                }
            }
        }

        // SIMPLE GROUND ROTATION
        // Just update the angle without complex pivot calculations
        // The penetration correction above keeps the rocket at correct height
        const dTheta = rocket.angularVelocity || 0;
        if (Math.abs(dTheta) > 0.00001) {
            rocket.rotation += dTheta;
        }

        // Dampen angular velocity with simple damping
        if (rocket.angularVelocity) {
            rocket.angularVelocity *= 0.90; // Simple uniform damping
            if (Math.abs(rocket.angularVelocity) < 0.0001) {
                rocket.angularVelocity = 0;
            }
        }

        // STEP 4: Check for rest
        const groundRelVel = rocket.body.velocity.sub(nearestBody.velocity);
        const speed = groundRelVel.mag();
        const angularSpeed = Math.abs(rocket.angularVelocity || 0);
        const isThrusting = rocket.controls.getThrottle() > 0 && rocket.engine.hasFuel();

        if (speed < 3 && angularSpeed < 0.01 && !isThrusting) {
            // Rocket is at rest - snap to zero velocity
            rocket.body.velocity = nearestBody.velocity.clone();
            rocket.angularVelocity = 0;
            return { isResting: true, restingOn: nearestBody };
        }

        return { isResting: false, restingOn: null };
    }

    /**
     * Get floor debug info for visualization
     */
    getFloorInfo(rocket: Rocket, nearestBody: Body | null): FloorDebugInfo | null {
        if (!nearestBody) return null;

        const planetRadius = nearestBody.radius * this.VISUAL_SCALE;
        const surfaceNormal = rocket.body.position.sub(nearestBody.position).normalize();
        const surfacePoint = nearestBody.position.add(surfaceNormal.scale(planetRadius));
        const tangent = new Vector2(-surfaceNormal.y, surfaceNormal.x);
        const floorWidth = 500;

        return {
            start: surfacePoint.add(tangent.scale(-floorWidth)),
            end: surfacePoint.add(tangent.scale(floorWidth)),
            normal: surfaceNormal,
            surfacePoint: surfacePoint
        };
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


        // Calculate surface info for debug visualization
        const planetRadius = nearestBody.radius * this.VISUAL_SCALE;

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

        // NOTE: Manual collision physics disabled - Matter.js handles collision now
        // The floorInfo is still returned for debug visualization
        // Matter.js will handle the actual collision with the ground body

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
