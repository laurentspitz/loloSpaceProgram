import { Physics } from './physics/Physics';
import { ThreeRenderer } from './rendering/ThreeRenderer';
import { SolarSystem } from './systems/SolarSystem';
import { Body } from './core/Body';
import { UI } from './ui/UI';
import { OrbitUtils } from './physics/OrbitUtils';
import { Rocket } from './entities/Rocket';
import { Vector2 } from './core/Vector2';
import { CollisionManager } from './physics/CollisionManager';
import { SphereOfInfluence } from './physics/SphereOfInfluence';


export class Game {
    bodies: Body[];
    renderer: ThreeRenderer;
    ui: UI;
    rocket: Rocket | null = null;
    collisionManager: CollisionManager;
    isRocketResting: boolean = false; // Track if rocket is resting on surface
    restingOn: Body | null = null; // Which body is rocket resting on
    lastTime: number = 0;
    timeScale: number = 60; // 1 second = 1 minute (was 3600 = 1 hour, too fast)
    timeWarp: number = 1;
    frameCount: number = 0;
    orbitRecalcInterval: number = 1; // Recalculate orbits every frame for smooth visualization

    // Max physics step size for stability (e.g. 1000 seconds)
    // If we warp time, we take multiple steps of this size or smaller
    readonly MAX_PHYSICS_STEP = 100;

    constructor() {
        const canvasId = 'gameCanvas';
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.renderer = new ThreeRenderer(canvas);
        this.ui = new UI(this.renderer);

        // Connect UI time warp controls
        this.ui.onTimeWarpChange = (factor: number) => {
            this.timeWarp = factor;
        };

        this.bodies = SolarSystem.generate();
        this.ui.init(this.bodies);

        // Initialize collision manager
        this.collisionManager = new CollisionManager();

        // Setup collision handler
        this.collisionManager.onCollision = (bodyA, bodyB) => {
            this.handleCollision(bodyA, bodyB);
        };

        // Create Matter.js bodies for all celestial bodies
        this.bodies.forEach(body => {
            this.collisionManager.createCelestialBody(body, 3.0); // Visual scale = 3.0
        });

        // Create rocket in low Earth orbit
        const earth = this.bodies.find(b => b.name === 'Earth')!;

        // IMPORTANT: Planets are rendered with visualScale = 3.0
        // So visual radius = earth.radius * 3.0
        // We need to orbit outside the VISUAL radius, not just the physical radius
        const visualRadius = earth.radius * 3.0; // Account for visual scaling
        const orbitAltitude = earth.radius * 0.5; // 50% of Earth radius above surface (~3000km)
        const orbitRadius = visualRadius + orbitAltitude;

        // Position: start above Earth (angle PI/2) to be visible
        const angle = Math.PI / 2; // Top of Earth
        const rocketPos = earth.position.add(new Vector2(
            Math.cos(angle) * orbitRadius,
            Math.sin(angle) * orbitRadius
        ));

        // Calculate orbital velocity for circular orbit: v = sqrt(GM/r)
        // Earth's mass is already scaled by 9x for visual physics
        const orbitalSpeed = Math.sqrt((6.674e-11 * earth.mass) / orbitRadius);

        // Velocity perpendicular to radius for circular orbit
        // angle = PI/2 (top of Earth), so perpendicular is to the left (-x direction)
        const rocketVel = earth.velocity.add(new Vector2(
            -Math.sin(angle) * orbitalSpeed,  // Perpendicular to radius
            Math.cos(angle) * orbitalSpeed
        ));

        this.rocket = new Rocket(rocketPos, rocketVel);
        this.renderer.currentRocket = this.rocket;

        // CRITICAL: Add rocket body to physics simulation!
        this.bodies.push(this.rocket.body);

        // Create Matter.js body for rocket
        this.collisionManager.createRocketBody(this.rocket);

        // Start with camera following rocket
        this.renderer.followedBody = this.rocket.body;

        // Zoom in on rocket (scale = meters to pixels, smaller = more zoomed in)
        this.renderer.scale = 1e-6; // Much closer zoom (was 1e-9)

        requestAnimationFrame((time) => {
            this.lastTime = time;
            this.loop(time);
        });
    }

    loop(time: number) {
        const currentTime = time;
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Handle time warp
        // const simulatedTime = dt * this.timeWarp;

        // Calculate total simulation time to pass this frame
        let totalDt = dt * this.timeScale * this.timeWarp;

        // Update rocket controls
        if (this.rocket) {
            // Pass real time (dt) for controls, and scaled physics time (totalDt) for thrust
            this.rocket.update(dt, totalDt);

            // DEBUG: Log physics state every ~1 second (60 frames)
            if (Math.floor(time / 1000) > Math.floor((time - dt * 1000) / 1000)) {
                const earth = this.bodies.find(b => b.name === 'Earth')!;
                const dist = this.rocket.body.position.distanceTo(earth.position);
                const vel = this.rocket.body.velocity.sub(earth.velocity).mag();
                const r = dist;
                const g = (6.674e-11 * earth.mass) / (r * r);
            }
        }

        // Sub-stepping for stability
        // Break the total time into safe chunks
        while (totalDt > 0) {
            const stepDt = Math.min(totalDt, this.MAX_PHYSICS_STEP);

            // Apply physics to all bodies
            // Rocket body is already in this.bodies (added in constructor)
            const allBodies = this.bodies;
            Physics.step(allBodies, stepDt);

            totalDt -= stepDt;
        }

        // Apply normal contact force if rocket is resting on surface
        if (this.rocket && this.isRocketResting && this.restingOn) {
            this.applyContactForce(this.rocket, this.restingOn, dt * this.timeScale * this.timeWarp);
        }

        // CRITICAL: Prevent rocket from penetrating planets (before Matter.js sync)
        if (this.rocket) {
            this.preventPenetration(this.rocket);
        }

        // Sync positions to Matter.js and check for collisions
        this.collisionManager.syncPositions(this.bodies, this.rocket);
        this.collisionManager.step(dt); // Use real dt, not scaled

        // Periodically recalculate orbits to handle gravitational perturbations
        this.frameCount++;
        if (this.frameCount >= this.orbitRecalcInterval) {
            this.frameCount = 0;
            this.bodies.forEach(body => {
                if (body.parent && !body.isLocked) {
                    body.orbit = OrbitUtils.calculateOrbit(body, body.parent);
                }
            });
        }

        // Render
        this.renderer.render(this.bodies, this.lastTime);
        this.ui.renderMinimap(this.bodies);

        if (this.rocket) {
            this.ui.updateRocketInfo(this.rocket);

            // Update trajectory (Keplerian Orbit)
            if (this.renderer.showTrajectory) {
                // Find body with dominant gravitational influence (Sphere of Influence)
                const dominantBody = SphereOfInfluence.findDominantBody(this.rocket, this.bodies);

                // Calculate orbit relative to dominant body
                // This gives us the analytical ellipse which is perfect for stable orbits
                this.rocket.body.parent = dominantBody;
                this.rocket.body.orbit = OrbitUtils.calculateOrbit(this.rocket.body, dominantBody);
            } else {
                this.rocket.body.orbit = null;
            }
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Handle collision between bodies
     */
    handleCollision(bodyA: Body | Rocket, bodyB: Body | Rocket): void {
        // Determine which is rocket and which is planet
        let rocket: Rocket | null = null;
        let planet: Body | null = null;

        if (bodyA instanceof Rocket) {
            rocket = bodyA;
            planet = bodyB as Body;
        } else if (bodyB instanceof Rocket) {
            rocket = bodyB;
            planet = bodyA as Body;
        }

        if (!rocket || !planet) return;

        // Calculate impact velocity
        const relVel = rocket.body.velocity.sub(planet.velocity);
        const impactSpeed = relVel.mag();

        // IMPORTANT: Correct penetration first to prevent passing through
        this.collisionManager.correctPenetration(rocket, planet, 3.0);

        // Collision response based on speed
        const SOFT_LANDING_THRESHOLD = 50; // m/s
        const CRASH_THRESHOLD = 200; // m/s

        if (impactSpeed < SOFT_LANDING_THRESHOLD) {
            // Soft landing - small bounce
            console.log('   ✅ Soft landing!');
            // Penetration correction already applied above
        } else if (impactSpeed < CRASH_THRESHOLD) {
            // Hard landing - bigger bounce, maybe damage
            console.log('   ⚠️ Hard landing!');
            // Apply additional bounce force
            const direction = rocket.body.position.sub(planet.position).normalize();
            rocket.body.velocity = rocket.body.velocity.add(direction.scale(impactSpeed * 0.3));
        } else {
            // Crash - game over or heavy damage
            console.log('   💥 CRASH!');
            // Zero out velocity (rocket stops)
            rocket.body.velocity = planet.velocity.clone();
            // TODO: Implement game over or damage system
        }
    }

    /**
     * Prevent rocket from penetrating any planet surface
     * Called every frame to enforce surface boundary
     */
    preventPenetration(rocket: Rocket): void {
        const VISUAL_SCALE = 3.0;

        // Reset resting state
        let wasResting = this.isRocketResting;
        this.isRocketResting = false;
        this.restingOn = null;

        // Check all bodies for potential penetration
        this.bodies.forEach(body => {
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
                        this.isRocketResting = true;
                        this.restingOn = body;
                        if (!wasResting) {
                            console.log(`🛑 Rocket resting on ${body.name} surface`);
                            console.log(`   📏 Distance from center: ${dist.toFixed(1)}m`);
                            console.log(`   🌍 Planet visual radius: ${visualRadius.toFixed(1)}m`);
                            console.log(`   🚀 Rocket half-height: ${rocketHalfHeight.toFixed(1)}m`);
                            console.log(`   📐 Expected contact dist: ${contactDist.toFixed(1)}m`);
                            console.log(`   ❌ Gap from surface: ${(dist - contactDist).toFixed(1)}m`);
                        }
                    } else if (normalSpeed < restThreshold) {
                        // Normal speed low but still sliding - no bounce, just friction
                        const bounceVelocity = body.velocity
                            .add(tangentialVel)
                            .add(frictionForce);
                        rocket.body.velocity = bounceVelocity;
                        console.log(`🛡️ Sliding on ${body.name}, friction: ${(tangentialSpeed * friction).toFixed(1)} m/s`);
                    } else {
                        // Normal bounce with friction
                        const bounceVelocity = body.velocity
                            .add(tangentialVel)
                            .add(frictionForce)
                            .sub(normalComponent.scale(restitution));
                        rocket.body.velocity = bounceVelocity;
                        console.log(`🛡️ Bounce on ${body.name}, speed: ${normalSpeed.toFixed(1)} m/s, friction: ${(tangentialSpeed * friction).toFixed(1)} m/s`);
                    }
                }
            }
        });
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
}
