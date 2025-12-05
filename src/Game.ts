import { Physics } from './physics/Physics';
import { ThreeRenderer } from './rendering/ThreeRenderer';
import { Body } from './core/Body';
import { UI } from './ui/UI';
import { OrbitUtils } from './physics/OrbitUtils';
import { Rocket } from './entities/Rocket';
import { Debris } from './entities/Debris';
import { Particle } from './entities/Particle';
import { CollisionManager } from './physics/CollisionManager';
import { SphereOfInfluence } from './physics/SphereOfInfluence';
import { TrajectoryPredictor } from './systems/TrajectoryPredictor';
import { Vector2 } from './core/Vector2';
import { SceneSetup } from './SceneSetup';
import { ManeuverNodeManager } from './systems/ManeuverNodeManager';


export class Game {
    bodies: Body[];
    debris: Debris[] = []; // Track debris separately
    particles: Particle[] = []; // Track particles
    renderer: ThreeRenderer;
    ui: UI;
    rocket: Rocket | null = null;
    collisionManager: CollisionManager;
    maneuverNodeManager: ManeuverNodeManager;
    isRocketResting: boolean = false; // Track if rocket is resting on surface
    restingOn: Body | null = null; // Which body is rocket resting on
    lastTime: number = 0;
    timeScale: number = 1; // 1x = Real time
    timeWarp: number = 1;
    frameCount: number = 0;
    orbitRecalcInterval: number = 1; // Recalculate orbits every frame for smooth visualization

    // Max physics step size for stability (e.g. 1 second)
    // If we warp time, we take multiple steps of this size or smaller
    readonly MAX_PHYSICS_STEP = 1;
    private sceneSetup: typeof SceneSetup;
    private animationFrameId: number | null = null;
    private isDisposed: boolean = false;

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
        this.maneuverNodeManager = new ManeuverNodeManager();

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

        // Handle stage separation
        this.rocket.onStageSeparation = (debris: Debris) => {
            this.bodies.push(debris);
            this.debris.push(debris); // Add to debris list
            console.log('Debris added to simulation');
        };

        this.renderer.currentRocket = this.rocket;
        this.ui.init(this.bodies, this.rocket || undefined, this.maneuverNodeManager);

        // Start with camera following rocket
        this.renderer.followedBody = this.rocket!.body;

        // Zoom in on rocket (scale = meters to pixels, smaller = more zoomed in)
        this.renderer.scale = 1e-6; // Much closer zoom (was 1e-9)

        this.animationFrameId = requestAnimationFrame((time) => {
            this.lastTime = time;
            this.loop(time);
        });
    }

    loop(time: number) {
        // Stop loop if disposed
        if (this.isDisposed) {
            return;
        }

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

        // Handle debris collisions and explosions
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            const crashed = this.collisionManager.preventDebrisPenetration(d, this.bodies);

            if (crashed) {
                console.log('💥 Debris exploded on impact!');

                // Spawn explosion particles
                const particleCount = 20;
                for (let j = 0; j < particleCount; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 50 + 20; // Fast explosion
                    const velocity = new Vector2(
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed
                    ).add(d.velocity.scale(0.5)); // Inherit some velocity

                    const color = Math.random() > 0.5 ? '#FF4500' : '#FFA500'; // Orange/Red
                    const size = Math.random() * 2 + 1;
                    const lifetime = Math.random() * 1.0 + 0.5; // 0.5-1.5s

                    this.particles.push(new Particle(
                        d.position.clone(),
                        velocity,
                        color,
                        size,
                        lifetime
                    ));
                }

                // Remove from physics bodies
                const bodyIndex = this.bodies.indexOf(d);
                if (bodyIndex > -1) {
                    this.bodies.splice(bodyIndex, 1);
                }

                // Remove from debris list
                this.debris.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }

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
        this.renderer.isRocketResting = this.isRocketResting; // Pass resting state for visual offset
        this.renderer.render(this.bodies, this.particles, this.lastTime, dt);
        this.ui.renderMinimap(this.bodies);

        if (this.rocket) {
            this.ui.updateRocketInfo(this.rocket);

            // Update trajectory (Keplerian Orbit or Numerical Prediction)
            if (this.renderer.showTrajectory) {
                // Find body with dominant gravitational influence (Sphere of Influence)
                const dominantBody = SphereOfInfluence.findDominantBody(this.rocket, this.bodies);

                // Calculate orbit relative to dominant body
                // This gives us the analytical ellipse which is perfect for stable orbits
                this.rocket.body.parent = dominantBody;
                const orbit = OrbitUtils.calculateOrbit(this.rocket.body, dominantBody);

                if (orbit) {
                    // Valid elliptical orbit - use analytical solution
                    this.rocket.body.orbit = orbit;

                    // Check if we have maneuver nodes
                    if (this.maneuverNodeManager.nodes.length > 0) {
                        // Predict trajectory with maneuvers
                        const prediction = this.maneuverNodeManager.predictTrajectoryWithManeuvers(
                            this.rocket,
                            this.bodies,
                            100, // Time step (100s for long range)
                            20000 // Number of steps (2,000,000s = ~23 days)
                        );
                        this.renderer.updateManeuverTrajectory(prediction.segments, prediction.colors);
                    } else {
                        // Clear maneuver trajectory (keep current orbit visible)
                        this.renderer.updateManeuverTrajectory([], []);
                    }

                    // Update maneuver node visuals
                    if (this.renderer instanceof ThreeRenderer && this.ui.maneuverNodeUI) {
                        // Update hover state each frame to keep ghost node under mouse
                        this.ui.maneuverNodeUI.update();

                        this.renderer.updateManeuverNodes(
                            this.maneuverNodeManager.nodes,
                            this.ui.maneuverNodeUI.getHoverPosition(),
                            this.ui.maneuverNodeUI.hoveredNodeId,
                            this.ui.maneuverNodeUI.selectedNodeId
                        );
                    }
                } else {
                    // Escape trajectory or hyperbolic orbit - use numerical prediction
                    this.rocket.body.orbit = null;
                    // Use TrajectoryPredictor to generate points for visualization
                    // IMPORTANT: Update every frame since body positions change
                    const trajectoryPoints = TrajectoryPredictor.predict(
                        this.rocket,
                        this.bodies,
                        120, // 2 minute steps (longer for Sun-scale distances)
                        1000 // 1000 steps = ~33 hours of trajectory
                    );
                    this.renderer.updateTrajectory(trajectoryPoints, this.renderer.getCenter());
                }
            } else {
                this.rocket.body.orbit = null;
                this.renderer.updateTrajectory([], this.renderer.getCenter());
            }
        }

        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Clean up resources when game is stopped
     */
    dispose() {
        this.isDisposed = true;

        // Cancel animation loop
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clean up renderer (Three.js resources, event listeners, etc.)
        if (this.renderer) {
            this.renderer.dispose();
        }

        // Clean up UI
        if (this.ui) {
            this.ui.dispose();
        }

        // Remove canvas if it was created by this instance
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.remove();
        }

        console.log('Game disposed');
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
