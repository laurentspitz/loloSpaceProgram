import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { RocketEngine } from './RocketEngine';
import { RocketControls } from './RocketControls';
import { Debris } from './Debris';

/**
 * Rocket - Main rocket class using composition pattern
 * Contains a Body for physics, Engine for propulsion, and Controls for input
 */
export class Rocket {
    body: Body;
    engine: RocketEngine;
    controls: RocketControls;
    targetBody: Body | null = null;

    // Rocket state
    rotation: number = Math.PI / 2; // Angle in radians (starts pointing up)
    dryMass: number; // Mass without fuel
    isActive: boolean = true;

    // Visual properties - adjusted for KSP X200-32 + Mk1 Pod + LV-T30
    readonly width: number = 3.0;          // Base width (Tank diameter)
    readonly tankHeight: number = 4.5;     // Ratio ~1.5 for X200-32
    readonly capsuleHeight: number = 1.5;  // Smaller pod (Mk1 is 1.25m vs 2.5m tank)
    readonly engineHeight: number = 1.8;   // Smaller engine

    // Part stack from assembly (if built in Hangar)
    partStack?: Array<{ partId: string; definition: any; position: any; rotation?: number; flipped?: boolean }>;

    // Stages (arrays of parts, from top to bottom)
    stages: Array<Array<{ partId: string; definition: any; position: any; rotation?: number; flipped?: boolean }>> = [];
    currentStageIndex: number = 0;

    // Callback for stage separation (to spawn debris)
    onStageSeparation?: (debris: Debris) => void;

    // Mesh version for renderer to detect changes
    meshVersion: number = 0;

    constructor(position: Vector2, velocity: Vector2, assemblyConfig?: any) {
        // Use assembly config if provided, otherwise use defaults
        const fuelMass = assemblyConfig?.fuelMass || 500000;
        this.dryMass = assemblyConfig?.dryMass || 5000;
        const totalMass = this.dryMass + fuelMass;
        const thrust = assemblyConfig?.thrust || 5000000;
        const isp = assemblyConfig?.isp || 350;

        // Store part stack for rendering
        this.partStack = assemblyConfig?.parts;

        // Initialize stages if parts are provided
        if (this.partStack && this.partStack.length > 0) {
            this.initializeStages(this.partStack);
        }

        // Create physics body
        // Radius is approximate for collision detection
        // Use half of total height as radius to cover the full length
        const initialHeight = this.getTotalHeight();
        const radius = initialHeight / 2;
        this.body = new Body(
            "Rocket",
            totalMass,
            radius,
            "#FFFFFF",
            position,
            velocity
        );

        // Create engine
        this.engine = new RocketEngine(thrust, fuelMass, isp);

        // Create controls
        this.controls = new RocketControls();
    }

    /**
     * Update rocket physics and state
     */
    update(deltaTime: number, physicsDeltaTime: number) {
        if (!this.isActive) return;

        // Get player input
        const input = this.controls.getInput();

        // Update rotation (using real-time delta for controllable input)
        this.rotation += input.rotation * deltaTime;

        // Calculate thrust direction (rotation = 0 is right, PI/2 is up)
        const thrustDir = new Vector2(
            Math.cos(this.rotation),
            Math.sin(this.rotation)
        );

        // Apply thrust if throttle > 0 and has fuel
        if (input.throttle > 0 && this.engine.hasFuel()) {
            const thrust = this.engine.getThrust(input.throttle);
            const force = thrustDir.scale(thrust);

            // F = ma => a = F/m
            const acceleration = force.scale(1 / this.body.mass);

            // Apply acceleration directly to velocity
            // Use physicsDeltaTime to match the simulation speed
            this.body.velocity = this.body.velocity.add(acceleration.scale(physicsDeltaTime));

            // Consume fuel and update mass
            const fuelConsumed = this.engine.consumeFuel(input.throttle, physicsDeltaTime);
            this.body.mass = Math.max(this.dryMass, this.body.mass - fuelConsumed);
        }

        // Check for staging
        if (input.stage) {
            this.activateStage();
        }
    }

    /**
     * Initialize stages from part stack
     * Splits parts into stages based on decouplers
     */
    private initializeStages(parts: Array<{ partId: string; definition: any; position: any; rotation?: number; flipped?: boolean }>) {
        this.stages = [];
        let currentStage: Array<{ partId: string; definition: any; position: any; rotation?: number; flipped?: boolean }> = [];

        // Iterate from top to bottom (assuming parts are sorted by Y or we sort them)
        // Actually, let's sort them by Y descending (top first)
        const sortedParts = [...parts].sort((a, b) => b.position.y - a.position.y);

        for (const part of sortedParts) {
            currentStage.push(part);

            // If this part is a decoupler, it marks the end of a stage (everything BELOW it is the next stage? No.)
            // Usually: 
            // Stage 0: Top payload
            // Decoupler
            // Stage 1: Tank + Engine

            // If we hit a decoupler, that decoupler belongs to the UPPER stage (it stays with upper stage? or falls with lower?)
            // KSP: Decoupler stays with the lower stage usually, or splits.
            // Let's say: Decoupler stays with the stage BELOW it.
            // So when we hit a decoupler, we finish the CURRENT stage (upper), and start a NEW stage (lower) which INCLUDES the decoupler.

            if (part.definition.type === 'decoupler') {
                // Move the decoupler to the next stage?
                // Actually, let's keep it simple:
                // Split whenever we see a decoupler.
                // The decoupler itself should probably be the TOP of the LOWER stage.

                // Remove decoupler from current stage
                currentStage.pop();

                // Push current stage (Upper)
                if (currentStage.length > 0) {
                    this.stages.push(currentStage);
                }

                // Start new stage with decoupler
                currentStage = [part];
            }
        }

        // Push the last stage (Bottom)
        if (currentStage.length > 0) {
            this.stages.push(currentStage);
        }

        // Reverse stages so index 0 is the BOTTOM stage (first to launch/detach)?
        // Or index 0 is TOP?
        // Let's say index 0 is current active stage.
        // If we have [Payload], [Booster], we want to start with BOTH attached.
        // Staging means dropping the BOTTOM stage.

        // Wait, "Staging" usually means activating the NEXT stage.
        // If we have a full rocket, we are flying "Stage 0" (everything).
        // Pressing space activates "Stage 1" (drops bottom).

        // Let's store stages as "Groups of parts that fall off together".
        // Stage 0: Bottom Booster (Tank + Engine + Decoupler)
        // Stage 1: Top Payload (Pod)

        // When we stage, we drop Stage 0.
        // So we should reverse the order we calculated above.
        // Above: Top -> Bottom.
        // [Pod] -> Stage
        // [Decoupler, Tank, Engine] -> Stage

        // So stages[0] = Pod
        // stages[1] = Decoupler + Tank + Engine

        // We want to drop stages[1] first.
        // So let's reverse it? No, let's just track current index.
        // Active parts = All stages from 0 to current.
        // Wait, no.

        // Let's simplify:
        // We have a list of stages.
        // Stage 0: Bottom-most parts (to be dropped first).
        // Stage 1: Next parts.
        // ...
        // Stage N: Payload (never dropped).

        // So we need to group from Bottom to Top.
        this.stages = [];
        currentStage = [];

        // Sort Bottom to Top
        const bottomUpParts = [...parts].sort((a, b) => a.position.y - b.position.y);

        for (const part of bottomUpParts) {
            // If part is decoupler, it ends the current stage (bottom stage)
            if (part.definition.type === 'decoupler') {
                // Decoupler belongs to the stage being dropped (usually)
                currentStage.push(part);
                this.stages.push(currentStage);
                currentStage = [];
            } else {
                currentStage.push(part);
            }
        }

        // Push remaining parts (Payload)
        if (currentStage.length > 0) {
            this.stages.push(currentStage);
        }

        // Now stages[0] is the bottom-most stage (first to drop).
        // stages[last] is the payload.
        this.currentStageIndex = 0;

        console.log('Rocket stages initialized:', this.stages.length);
    }

    /**
     * Activate next stage (decouple)
     */
    activateStage() {
        // If we are at the last stage (payload), nothing to decouple
        if (this.currentStageIndex >= this.stages.length - 1) {
            console.log('No more stages to decouple');
            return;
        }

        console.log(`Activating stage separation! Dropping stage ${this.currentStageIndex}`);

        // Get parts to drop
        const stageToDrop = this.stages[this.currentStageIndex];

        // Calculate properties of dropped stage for debris
        let debrisMass = 0;
        let debrisHeight = 0;
        stageToDrop.forEach(p => {
            debrisMass += p.definition.stats.mass + (p.definition.stats.fuel || 0);
            debrisHeight += p.definition.height;
        });

        // Create debris
        // Position: Spawn below the rocket to avoid immediate collision
        // Rocket center is at body.position.
        // We need to move debris down by (rocketHeight/2 + debrisHeight/2) ideally,
        // but let's just move it down by a safe margin relative to rotation.

        const separationDist = (this.tankHeight + this.engineHeight) / 2 + 2.0; // Approx half rocket height + margin
        const separationOffset = new Vector2(
            Math.cos(this.rotation + Math.PI) * separationDist,
            Math.sin(this.rotation + Math.PI) * separationDist
        );

        const debrisPos = this.body.position.add(separationOffset);

        // Create debris entity
        const debris = new Debris(
            debrisPos,
            this.body.velocity.clone(),
            debrisMass,
            stageToDrop
        );

        // Add slight separation force
        // Push debris down (relative to rocket rotation)
        const separationDir = new Vector2(
            Math.cos(this.rotation + Math.PI), // Down
            Math.sin(this.rotation + Math.PI)
        );
        debris.velocity = debris.velocity.add(separationDir.scale(5)); // Increased to 5 m/s separation

        // Add random rotation to debris
        debris.angularVelocity = (Math.random() - 0.5) * 2;
        debris.rotation = this.rotation;

        // Notify game to add debris
        if (this.onStageSeparation) {
            this.onStageSeparation(debris);
        }

        // Advance stage
        this.currentStageIndex++;

        // Update Rocket properties based on remaining parts
        this.recalculateStats();

        // Increment mesh version to trigger redraw
        this.meshVersion++;
    }

    /**
     * Recalculate mass, thrust, etc. based on remaining stages
     */
    private recalculateStats() {
        let newDryMass = 0;
        let newFuelMass = 0;
        let newThrust = 0;
        let totalIspWeighted = 0;

        // Iterate over remaining stages
        for (let i = this.currentStageIndex; i < this.stages.length; i++) {
            const stage = this.stages[i];
            stage.forEach(p => {
                const def = p.definition;
                newDryMass += def.stats.mass;
                newFuelMass += def.stats.fuel || 0;

                if (def.type === 'engine' && def.stats.thrust) {
                    newThrust += def.stats.thrust;
                    totalIspWeighted += (def.stats.isp || 0) * def.stats.thrust;
                }
            });
        }

        const newAvgIsp = newThrust > 0 ? totalIspWeighted / newThrust : 0;

        // Update physics body mass
        this.dryMass = newDryMass;
        this.body.mass = newDryMass + newFuelMass;

        // Update physics body radius based on new height
        const newHeight = this.getTotalHeight();
        this.body.radius = newHeight / 2;

        // Update engine
        this.engine = new RocketEngine(newThrust, newFuelMass, newAvgIsp || 300);

        // Update visual part stack (for renderer)
        // Flatten remaining stages
        this.partStack = [];
        for (let i = this.currentStageIndex; i < this.stages.length; i++) {
            this.partStack.push(...this.stages[i]);
        }

        console.log('Rocket stats updated:', {
            mass: this.body.mass,
            thrust: newThrust,
            fuel: newFuelMass
        });
    }

    /**
     * Get total height of rocket for rendering
     */
    getTotalHeight(): number {
        if (this.partStack && this.partStack.length > 0) {
            const positions = this.partStack.map(p => p.position.y);
            const minY = Math.min(...positions.map((y, i) => y - this.partStack![i].definition.height / 2));
            const maxY = Math.max(...positions.map((y, i) => y + this.partStack![i].definition.height / 2));
            return maxY - minY;
        }
        return this.capsuleHeight + this.tankHeight + this.engineHeight;
    }

    /**
     * Get rocket info for UI display
     */
    getInfo() {
        return {
            fuel: this.engine.getFuelPercent(),
            deltaV: this.engine.getDeltaV(this.dryMass),
            mass: this.body.mass,
            throttle: this.controls.getThrottle(),
            velocity: this.body.velocity.mag(),
            altitude: 0, // Will be calculated by game based on nearest body
            infiniteFuel: this.engine.infiniteFuel
        };
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.controls.dispose();
    }
}
