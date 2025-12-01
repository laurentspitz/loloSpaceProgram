import { Physics } from './physics/Physics';
import { ThreeRenderer } from './rendering/ThreeRenderer';
import { Body } from './core/Body';
import { UI } from './ui/UI';
import { OrbitUtils } from './physics/OrbitUtils';
import { Rocket } from './entities/Rocket';
import { CollisionManager } from './physics/CollisionManager';
import { SphereOfInfluence } from './physics/SphereOfInfluence';
import { SceneSetup } from './SceneSetup';


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
    private sceneSetup: typeof SceneSetup;

    constructor(assembly?: any) {
        this.sceneSetup = SceneSetup;

        // Initialize canvas
        let canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!canvas) {
            // Create canvas if it doesn't exist
            canvas = document.createElement('canvas');
            canvas.id = 'gameCanvas';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            document.body.appendChild(canvas);
        }

        // Resize canvas to fill window
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        this.renderer = new ThreeRenderer(canvas);
        this.ui = new UI(this.renderer);

        // Connect UI time warp controls
        this.ui.onTimeWarpChange = (factor: number) => {
            this.timeWarp = factor;
        };

        // Initialize collision manager
        this.collisionManager = new CollisionManager();

        // Setup collision handler
        this.collisionManager.onCollision = (bodyA, bodyB) => {
            this.handleCollision(bodyA, bodyB);
        };

        // Initialize scene
        this.bodies = this.sceneSetup.initBodies(this.collisionManager);

        // Create rocket (with assembly if provided)
        const rocketConfig = assembly?.getRocketConfig?.();
        this.rocket = this.sceneSetup.createRocket(this.bodies, this.collisionManager, rocketConfig);

        this.renderer.currentRocket = this.rocket;
        this.ui.init(this.bodies);

        // Start with camera following rocket
        this.renderer.followedBody = this.rocket!.body;

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

        // Calculate total simulation time to pass this frame
        let totalDt = dt * this.timeScale * this.timeWarp;

        // Update rocket controls
        if (this.rocket) {
            // Pass real time (dt) for controls, and scaled physics time (totalDt) for thrust
            this.rocket.update(dt, totalDt);
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
            this.collisionManager.applyContactForce(this.rocket, this.restingOn, dt * this.timeScale * this.timeWarp);
        }

        // CRITICAL: Prevent rocket from penetrating planets (before Matter.js sync)
        if (this.rocket) {
            const result = this.collisionManager.preventPenetration(this.rocket, this.bodies);
            this.isRocketResting = result.isResting;
            this.restingOn = result.restingOn;
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
}
