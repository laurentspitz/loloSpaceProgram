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
import { Config } from './Config';
import { GameTimeManager } from './managers/GameTimeManager';
import type { RocketConfig } from './Config';

import { MissionManager } from './systems/MissionSystem';

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

    // Systems
    public missionManager: MissionManager;

    // Max physics step size for stability (e.g. 1 second)
    // If we warp time, we take multiple steps of this size or smaller
    readonly MAX_PHYSICS_STEP = Config.PHYSICS.MAX_STEP;
    private sceneSetup: typeof SceneSetup;
    private animationFrameId: number | null = null;
    private isDisposed: boolean = false;
    private lastOrbitUpdateTime: number = 0;

    // Track total elapsed game time for date display
    elapsedGameTime: number = 0;

    constructor(assembly?: RocketConfig) {
        this.sceneSetup = SceneSetup;
        this.missionManager = new MissionManager();

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
        const rocketConfig = (assembly && typeof (assembly as any).getRocketConfig === 'function')
            ? (assembly as any).getRocketConfig()
            : assembly;

        console.log('Game: Initializing rocket with config:', rocketConfig);
        this.rocket = this.sceneSetup.createRocket(this.bodies, this.collisionManager, rocketConfig);

        // Handle stage separation
        this.rocket.onStageSeparation = (debris: Debris) => {
            this.bodies.push(debris);
            this.debris.push(debris); // Add to debris list
            console.log('Debris added to simulation');
        };

        this.renderer.currentRocket = this.rocket;
        if (this.rocket) {
            this.ui.init(this.bodies, this.rocket, this.maneuverNodeManager, this.missionManager);
        }
        // Start with camera following rocket
        this.renderer.followedBody = this.rocket!.body;

        // Zoom in on rocket (scale = meters to pixels, smaller = more zoomed in)
        this.renderer.scale = Config.GAMEPLAY.ROCKET.INITIAL_ZOOM; // Much closer zoom (was 1e-9)

        // Don't start the loop yet - wait for start() to be called
        // This allows deserializeState to run before the simulation begins
    }

    /**
     * Start the game loop
     * Call this after deserializeState if loading a saved game
     */
    start() {
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

        // Accumulate elapsed game time for date display
        this.elapsedGameTime += totalDt;
        this.ui.updateDateTime(this.elapsedGameTime);

        // Update Missions
        if (this.rocket && this.frameCount % 60 === 0) { // Check every ~1 second (60 frames)
            const currentYear = GameTimeManager.getYear(this.elapsedGameTime);
            this.missionManager.update(this.rocket, currentYear, this.bodies);
        }

        // Update rocket controls
        if (this.rocket) {
            // Pass real time (dt) for controls, and scaled physics time (totalDt) for thrust
            this.rocket.update(dt, totalDt, this.bodies);
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
            this.ui.update(); // Update cockpit/theme logic

            // Update trajectory (Keplerian Orbit or Numerical Prediction)
            if (this.renderer.showTrajectory) {
                // Find body with dominant gravitational influence (Sphere of Influence)
                const dominantBody = SphereOfInfluence.findDominantBody(this.rocket, this.bodies);

                // Calculate orbit relative to dominant body
                // This gives us the analytical ellipse which is perfect for stable orbits
                this.rocket.body.parent = dominantBody;
                const orbit = OrbitUtils.calculateOrbit(this.rocket.body, dominantBody);

                if (orbit) {
                    // Stability check: Only update if orbit changed significantly
                    let shouldUpdate = true;
                    if (this.rocket.body.orbit && this.rocket.body.parent === dominantBody) {
                        const old = this.rocket.body.orbit;
                        const da = Math.abs(orbit.a - old.a) / old.a;
                        const de = Math.abs(orbit.e - old.e);
                        const dOmega = Math.abs(orbit.omega - old.omega);

                        // Time-based hysteresis: Only update every 0.5s unless change is massive
                        const now = performance.now();
                        const timeSinceLastUpdate = now - (this.lastOrbitUpdateTime || 0);
                        const isMassiveChange = da > 0.1 || de > 0.1; // > 10% change

                        if (!isMassiveChange && timeSinceLastUpdate < 500) {
                            shouldUpdate = false;
                        } else if (da < 0.00001 && de < 0.0001 && dOmega < 0.0001) {
                            // Still keep the tight threshold for small changes even after time passes
                            shouldUpdate = false;
                        }
                    }

                    if (shouldUpdate) {
                        // Valid elliptical orbit - use analytical solution

                        // BUT: If we are in atmosphere, the analytical solution (Kepler) is wrong because it ignores drag.
                        // User wants to see the trajectory shrink due to drag.
                        // So if we are in atmosphere, we should force Numerical Prediction (which handles drag).

                        // Check atmospheric depth
                        const dist = this.rocket.body.position.distanceTo(dominantBody.position);
                        const PLANET_SCALE = 3.0; // Matching SceneSetup
                        const altitude = dist - (dominantBody.radius * PLANET_SCALE);
                        const inAtmosphere = dominantBody.atmosphereHeight && altitude < dominantBody.atmosphereHeight;

                        if (inAtmosphere && altitude > 0) {
                            // Force Numerical Prediction by nullifying orbit
                            // This falls through to the 'else' block below
                            this.rocket.body.orbit = null;
                        } else {
                            this.rocket.body.orbit = orbit;
                            this.lastOrbitUpdateTime = performance.now();
                        }
                    }

                    // CRITICAL: Clear numerical trajectory to prevent z-fighting and stale lines
                    this.renderer.updateTrajectory([], this.renderer.getCenter());

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

                        // Render future body position if there's a pending SOI encounter
                        if (this.renderer instanceof ThreeRenderer) {
                            const encounter = this.maneuverNodeManager.pendingEncounter;
                            if (encounter) {
                                this.renderer.renderFutureBodyPosition(encounter.body, encounter.timeToEncounter);
                            } else {
                                this.renderer.hideFutureBodyPositions();
                            }
                        }
                    } else {
                        // Clear maneuver trajectory (keep current orbit visible)
                        this.renderer.updateManeuverTrajectory([], []);
                        if (this.renderer instanceof ThreeRenderer) {
                            this.renderer.hideFutureBodyPositions();
                        }
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

                    // Adaptive Step Size:
                    // If close to body (in atmosphere), use small steps for drag accuracy.
                    // If far, use large steps.
                    const distToParent = this.rocket.body.position.distanceTo(dominantBody.position);
                    const PLANET_SCALE = 3.0;
                    const isInAtmo = dominantBody.atmosphereHeight && (distToParent < (dominantBody.radius * PLANET_SCALE) + dominantBody.atmosphereHeight);

                    // If in atmosphere, use 5s steps (high precision for drag).
                    // If outside/escape, use 120s steps.
                    const stepSize = isInAtmo ? 5.0 : 120.0;
                    const numSteps = isInAtmo ? 500 : 1000; // 500*5 = 2500s (40 mins, enough for reentry). 1000*120=33h.

                    const trajectoryPoints = TrajectoryPredictor.predict(
                        this.rocket,
                        this.bodies,
                        stepSize,
                        numSteps
                    );
                    this.renderer.updateTrajectory(trajectoryPoints, this.renderer.getCenter());
                }
            } else {
                this.rocket.body.orbit = null;
                this.renderer.updateTrajectory([], this.renderer.getCenter());
                this.renderer.updateManeuverTrajectory([], []);
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
        this.collisionManager.correctPenetration(rocket, planet, Config.GAMEPLAY.COLLISION.PENETRATION_CORRECTION_SPEED);

        // Collision response based on speed
        const SOFT_LANDING_THRESHOLD = Config.GAMEPLAY.COLLISION.SOFT_LANDING_THRESHOLD;
        const CRASH_THRESHOLD = Config.GAMEPLAY.COLLISION.CRASH_THRESHOLD;

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
            // Handle crash consequences
        }
    }
    /**
     * Serialize current game state to JSON object
     */
    serializeState(): any {
        if (!this.rocket) return null;

        // Serialize rocket data
        const rocketData = {
            name: 'Rocket', // Rockets don't have a name property, use generic name
            position: { x: this.rocket.body.position.x, y: this.rocket.body.position.y },
            velocity: { x: this.rocket.body.velocity.x, y: this.rocket.body.velocity.y },
            rotation: this.rocket.rotation || 0,
            angularVelocity: this.rocket.angularVelocity || 0,
            fuel: this.rocket.engine.fuelMass || 0,
            dryMass: this.rocket.dryMass || 0,
            electricity: this.rocket.electricity || 0,
            stages: this.rocket.stages.reduce((acc: any, stage: any[], index: number) => {
                acc[index] = stage.map(p => ({
                    partId: p.partId || "unknown",
                    definitionId: p.definition?.id || "unknown",
                    position: { x: p.position.x || 0, y: p.position.y || 0 },
                    rotation: p.rotation || 0
                }));
                return acc;
            }, {}),
            currentStageIndex: this.rocket.currentStageIndex !== undefined ? this.rocket.currentStageIndex : 0,
            // Reconstruct config if possible or store minimal data to rebuild
            parts: this.rocket.partStack ? this.rocket.partStack.map(p => ({
                partId: p.partId || "unknown",
                definition: p.definition || null, // Store full definition for now or ID
                position: p.position || { x: 0, y: 0 },
                rotation: p.rotation || 0,
                flipped: p.flipped || false
            })) : null
        };

        const state = {
            version: 1,
            timestamp: Date.now(),
            elapsedGameTime: this.elapsedGameTime,
            rocket: rocketData,
            camera: {
                position: { x: this.renderer.camera.position.x, y: this.renderer.camera.position.y, z: this.renderer.camera.position.z },
                zoom: this.renderer.scale,
                targetId: this.renderer.followedBody ? this.renderer.followedBody.name : null
            },
            simulation: {
                timeScale: this.timeScale,
                timeWarp: this.timeWarp,
                paused: this.timeScale === 0
            },
            missions: this.missionManager.serialize()
        };

        return state;
    }

    /**
     * Restore game state from JSON object
     */
    deserializeState(state: any) {
        if (!state || state.version !== 1) {
            console.error("Invalid save state version");
            return;
        }

        // 1. Restore Simulation Time
        this.elapsedGameTime = state.elapsedGameTime || 0;
        this.timeWarp = state.simulation.timeWarp;
        // Don't auto-pause or set timeScale yet, user might want to start paused

        // Restore Missions
        if (state.missions) {
            this.missionManager.deserialize(state.missions);
        }

        // 2. Restore Rocket
        if (state.rocket && this.rocket) {
            // Reposition existing rocket or create new one?
            // For now, let's update the existing rocket if compatible
            const r = state.rocket;

            this.rocket.body.position = new Vector2(r.position.x, r.position.y);
            this.rocket.body.velocity = new Vector2(r.velocity.x, r.velocity.y);
            this.rocket.rotation = r.rotation;
            this.rocket.angularVelocity = r.angularVelocity || 0;

            // Restore resources
            if (r.fuel !== undefined) this.rocket.engine.fuelMass = r.fuel;
            if (r.electricity !== undefined) this.rocket.electricity = r.electricity;

            // Restore Parts/Stages? 
            // Complex: If parts broke off, we need to handle that.
            // For MVP: Assuming same rocket structure.
            if (r.currentStageIndex !== undefined) {
                this.rocket.currentStageIndex = r.currentStageIndex;
                // DON'T call recalculateStats() here - it will overwrite the fuel we just restored!
                // this.rocket.recalculateStats(); 
            }

            // Force physics sync
            this.rocket.body.isStatic = false; // Wake up
        } else if (state.rocket && !this.rocket) {
            console.warn('⚠️ Save has rocket data but no rocket exists in game!');
        }

        // 3. Restore Camera
        if (state.camera) {
            this.renderer.scale = state.camera.zoom;
            // Target
            if (state.camera.targetId) {
                const target = this.bodies.find(b => b.name === state.camera.targetId);
                if (target) {
                    this.renderer.followedBody = target;
                } else if (state.camera.targetId === 'Rocket' && this.rocket) {
                    this.renderer.followedBody = this.rocket.body;
                }
            }
        }

        // 4. CRITICAL: Update all celestial bodies to their correct positions at this game time
        // Fast-forward ONLY the planets, NOT the rocket (to preserve saved state)

        // Make rocket static temporarily so it doesn't move during fast-forward
        if (this.rocket) {
            const wasStatic = this.rocket.body.isStatic;
            this.rocket.body.isStatic = true;

            // Fast-forward the simulation to the saved time (planets only)
            const timeStep = 0.1; // 0.1 second steps
            let timeRemaining = this.elapsedGameTime;

            while (timeRemaining > 0) {
                const dt = Math.min(timeStep, timeRemaining);
                Physics.step(this.bodies, dt);
                timeRemaining -= dt;
            }

            // Restore rocket's original static state
            this.rocket.body.isStatic = wasStatic;
        }

        // CRITICAL: Reassign renderer's current rocket reference
        // Without this, the renderer doesn't know about the rocket and won't draw it
        if (this.rocket) {
            this.renderer.currentRocket = this.rocket;
        }
    }
}
