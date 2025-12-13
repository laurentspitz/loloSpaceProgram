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
    angularVelocity: number = 0;
    angularDamping: number = 0.5; // Stability
    momentOfInertia: number = 1000;
    centerOfMass: Vector2 = new Vector2(0, 0); // Local CoM

    dryMass: number; // Mass without fuel
    isActive: boolean = true;

    // Electricity
    electricity: number = 0;
    maxElectricity: number = 0;

    // Visual properties - adjusted for KSP X200-32 + Mk1 Pod + LV-T30
    readonly width: number = 3.0;          // Base width (Tank diameter)
    readonly tankHeight: number = 4.5;     // Ratio ~1.5 for X200-32
    readonly capsuleHeight: number = 1.5;  // Smaller pod (Mk1 is 1.25m vs 2.5m tank)
    readonly engineHeight: number = 1.8;   // Smaller engine

    // Part stack from assembly (if built in Hangar)
    partStack?: Array<{ partId: string; definition: any; position: any; rotation?: number; flipped?: boolean; active?: boolean; deployed?: boolean; manualEnabled?: boolean; currentFuel?: number }>;

    // Stages (arrays of parts, from top to bottom)
    stages: Array<Array<{ partId: string; definition: any; position: any; rotation?: number; flipped?: boolean; active?: boolean; deployed?: boolean; manualEnabled?: boolean; currentFuel?: number }>> = [];
    currentStageIndex: number = 0;

    // Callback for stage separation (to spawn debris)
    onStageSeparation?: (debris: Debris) => void;

    // Mesh version for renderer to detect changes
    meshVersion: number = 0;

    // Crossfeed: allow fuel from upper stages to flow to current stage (disabled by default)
    crossfeedEnabled: boolean = false;

    /**
     * Check if a part is in the CURRENT active stage
     * Only parts in stages[currentStageIndex] should fire (engines)
     */
    isPartActive(part: { partId: string; position: any }): boolean {
        if (!this.stages || this.stages.length === 0) return true;

        // Only check the CURRENT stage (not all attached stages)
        const currentStage = this.stages[this.currentStageIndex];
        if (!currentStage) return false;

        // Tolerance for position comparison (floating point issues)
        const EPSILON = 0.001;

        for (const stagePart of currentStage) {
            // Match by position with tolerance
            const dx = Math.abs(stagePart.position.x - (part.position.x || 0));
            const dy = Math.abs(stagePart.position.y - (part.position.y || 0));
            if (dx < EPSILON && dy < EPSILON && stagePart.partId === part.partId) {
                return true;
            }
        }

        return false;
    }

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
        // Initialize stages if parts are provided
        if (this.partStack && this.partStack.length > 0) {
            this.initializeStages(this.partStack);
            // Derive all stats (mass, fuel, electricity, engine) from parts
            // Moved to AFTER body creation below
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

        // Recalculate stats now that body exists
        if (this.partStack && this.partStack.length > 0) {
            this.recalculateStats();
            // Force electricity to full on spawn
            this.electricity = this.maxElectricity;
        }

        // Create engine
        this.engine = new RocketEngine(thrust, fuelMass, isp);

        // Create controls
        this.controls = new RocketControls();

        // Initial mass props
        if (this.partStack) {
            this.calculateMassProperties();
        }
    }

    /**
     * Update rocket physics and state
     */
    update(_deltaTime: number, physicsDeltaTime: number, bodies?: Body[]) {
        if (!this.isActive) return;

        // Get player input
        const input = this.controls.getInput();

        // 1. Calculate Forces and Torques
        let totalForce = new Vector2(0, 0); // Local Frame force
        let totalTorque = 0;

        // Apply Atmospheric Drag
        if (bodies) {
            this.applyDrag(physicsDeltaTime, bodies);
        }

        // Engines & RCS
        if (this.partStack) {
            let activeThrust = 0;
            let totalRCSThrust = 0; // Track RCS usage for fuel
            let totalMaxThrust = 0; // For calculating weighted throttle
            let weightedThrottleSum = 0; // Sum of (thrust * effectiveThrottle) for fuel consumption

            this.partStack.forEach(part => {
                // Reset active state
                part.active = false;

                // Main Engines & Boosters - Only fire if part is in active stages
                if ((part.definition.type === 'engine' || part.definition.type === 'booster') && part.definition.stats.thrust) {
                    const isInActiveStage = this.isPartActive(part);

                    // Determine effective throttle for this engine:
                    // - If manualEnabled is true: fire at 100%
                    // - If manualEnabled is false: don't fire
                    // - If manualEnabled is undefined: use global throttle
                    let effectiveThrottle = input.throttle;
                    if (part.manualEnabled !== undefined) {
                        effectiveThrottle = part.manualEnabled ? 1.0 : 0;
                    }



                    if (effectiveThrottle > 0 && this.hasFuelInActiveStage() && isInActiveStage) {
                        const maxThrust = part.definition.stats.thrust;
                        const thrustMag = maxThrust * effectiveThrottle;
                        activeThrust += thrustMag;

                        // Track for weighted fuel consumption
                        totalMaxThrust += maxThrust;
                        weightedThrottleSum += maxThrust * effectiveThrottle;

                        // Force Direction in Part Frame: (0, 1) [Up/Forward]
                        // Rotate by Part Rotation
                        const pr = part.rotation || 0;
                        const tx = 0 * Math.cos(pr) - 1 * Math.sin(pr);
                        const ty = 0 * Math.sin(pr) + 1 * Math.cos(pr);
                        const force = new Vector2(tx, ty).scale(thrustMag);

                        totalForce = totalForce.add(force);

                        // Torque = r x F
                        const px = part.position.x || 0;
                        const py = part.position.y || 0;
                        const pos = new Vector2(px, py);
                        const arm = pos.sub(this.centerOfMass);

                        // Cross product in 2D: x*y - y*x
                        const torque = arm.x * force.y - arm.y * force.x;
                        totalTorque += torque;

                        part.active = true;
                    } else {
                        part.active = false;
                    }
                }

                // RCS Thrusters
                if (part.definition.type === 'rcs' && part.definition.stats.thrust) {
                    part.active = false;

                    if (input.rcsEnabled && input.rotation !== 0 && this.hasFuelInActiveStage()) {
                        const thrustMag = part.definition.stats.thrust;

                        // Force Vector
                        const pr = part.rotation || 0;
                        const tx = 0 * Math.cos(pr) - 1 * Math.sin(pr);
                        const ty = 0 * Math.sin(pr) + 1 * Math.cos(pr);
                        const forceDir = new Vector2(tx, ty);

                        // Potential Torque
                        const px = part.position.x || 0;
                        const py = part.position.y || 0;
                        const pos = new Vector2(px, py);
                        const arm = pos.sub(this.centerOfMass);

                        const unitTorque = arm.x * forceDir.y - arm.y * forceDir.x;

                        // Check alignment with desired rotation
                        // input.rotation > 0 (Left/CCW) -> matches +Torque
                        if (unitTorque * input.rotation > 0.1) {
                            // Activate
                            part.active = true;
                            const force = forceDir.scale(thrustMag);
                            totalForce = totalForce.add(force);
                            totalTorque += unitTorque * thrustMag;
                            totalRCSThrust += thrustMag;
                        }
                    }
                }
            });



            // If no explicit engines in stack (fallback or simplified mode), use default
            if (activeThrust === 0 && totalRCSThrust === 0 && (!this.partStack || this.partStack.length === 0) && input.throttle > 0) {
                // Fallback logic for simple rocket
                const thrust = this.engine.getThrust(input.throttle);
                totalForce = new Vector2(0, 1).scale(thrust);
                // No torque for centered engine
            }

            // Consume fuel from tanks in the current active stage
            // 1. Engines - use weighted effective throttle for consumption
            if (activeThrust > 0 && totalMaxThrust > 0) {
                const avgEffectiveThrottle = weightedThrottleSum / totalMaxThrust;
                const fuelConsumed = this.consumeFuelFromActiveStage(avgEffectiveThrottle, physicsDeltaTime);
                this.body.mass = Math.max(this.dryMass, this.body.mass - fuelConsumed);
            }
            // 2. RCS (Simplified consumption)
            if (totalRCSThrust > 0) {
                // Approximate consumption relative to main engine efficiency
                // Or just arbitrary small amount. 
                const rcsFuel = totalRCSThrust * 0.0000005 * physicsDeltaTime; // Very efficient?
                // Just subtract from body mass directly
                if (this.body.mass > this.dryMass) {
                    this.body.mass -= rcsFuel;
                }
            }
        }

        // Reaction Wheels / SAS (Linked to Pods)
        let hasReactionWheels = false;
        if (this.partStack) {
            // Check for Pods (Capsules) which have built-in reaction wheels
            hasReactionWheels = this.partStack.some(p => p.definition.type === 'capsule');
        }

        // Only apply reaction wheel torque and damping if SAS is enabled and wheels exist
        // AND we have electricity
        // AND the wheels are actually capable (sasConsumption > 0 or explicit stats)
        // Currently assuming sasConsumption > 0 implies capability.
        const canApplyTorque = this.partStack?.some(p =>
            p.definition.type === 'capsule' &&
            (p.definition.stats.sasConsumption && p.definition.stats.sasConsumption > 0)
        );

        if (hasReactionWheels && canApplyTorque && input.sasEnabled) {
            // Check if SAS is actually doing work ( User Input OR Angular Velocity to damp)
            const isWorking = Math.abs(input.rotation) > 0.01 || Math.abs(this.angularVelocity) > 0.01;

            if (isWorking) {
                // Calculate total SAS consumption
                let sasConsumption = 0;
                if (this.partStack) {
                    this.partStack.forEach(p => {
                        if (p.definition.type === 'capsule' && p.definition.stats.sasConsumption) {
                            sasConsumption += p.definition.stats.sasConsumption;
                        }
                    });
                }

                // Consume electricity
                const energyNeeded = sasConsumption * physicsDeltaTime;
                if (this.electricity >= energyNeeded) {
                    this.electricity -= energyNeeded;

                    // Reduced control power
                    // Was 20 * mass, now 2 * mass
                    const controlPower = this.body.mass * 2.0;
                    const controlTorque = input.rotation * controlPower;
                    totalTorque += controlTorque;

                    // Angular Damping (Stability Assist)
                    // Reduced damping to match lower torque
                    const damping = this.angularDamping * (this.body.mass * 2.0);
                    totalTorque -= this.angularVelocity * damping;
                } else {
                    // Out of power!
                    this.electricity = 0;
                    // No SAS control
                }
            }
        }



        // 2. Integrate Physics

        // Angular
        const angularAccel = totalTorque / Math.max(1, this.momentOfInertia);
        this.angularVelocity += angularAccel * physicsDeltaTime;
        this.rotation += this.angularVelocity * physicsDeltaTime;

        // Linear
        // Rotate local Force to World Force
        // Rocket Local Up is Y+. Rocket Angle is `rotation`.
        // World Angle of Rocket Y+ is `rotation - PI/2` (since rotation=PI/2 means Up).
        const angle = this.rotation - Math.PI / 2;
        const wx = totalForce.x * Math.cos(angle) - totalForce.y * Math.sin(angle);
        const wy = totalForce.x * Math.sin(angle) + totalForce.y * Math.cos(angle);
        const worldForce = new Vector2(wx, wy);

        // F = ma
        const linearAccel = worldForce.scale(1 / this.body.mass);
        this.body.velocity = this.body.velocity.add(linearAccel.scale(physicsDeltaTime));

        // Check for staging
        if (input.stage) {
            this.activateStage();
        }

        // Check for parachute deployment
        if (input.deployParachute) {
            this.deployParachute();
        }

        // Check for fairing ejection - defer to after physics step
        if (input.ejectFairings) {
            this.pendingFairingEjection = true;
        }
    }

    // Flag to defer fairing ejection until after physics
    pendingFairingEjection: boolean = false;

    /**
     * Execute any pending fairing ejection (called after physics step)
     */
    executePendingEjection() {
        if (this.pendingFairingEjection) {
            this.pendingFairingEjection = false;
            this.ejectFairings();
        }
    }

    /**
     * Calculate Center of Mass and Inertia
     */
    private calculateMassProperties() {
        if (!this.partStack || this.partStack.length === 0) {
            this.momentOfInertia = this.body.mass * 20; // Default approximation
            this.centerOfMass = new Vector2(0, 0);
            return;
        }

        let totalMass = 0;
        let weightedPos = new Vector2(0, 0);

        this.partStack.forEach(part => {
            const m = part.definition.stats.mass + (part.definition.stats.fuel || 0);
            totalMass += m;

            const px = part.position.x || 0;
            const py = part.position.y || 0;
            const pos = new Vector2(px, py);

            weightedPos = weightedPos.add(pos.scale(m));
        });

        if (totalMass > 0) {
            this.centerOfMass = weightedPos.scale(1 / totalMass);
        }

        // Calculate Moment of Inertia (I = sum(m * r^2))
        let inertia = 0;
        this.partStack.forEach(part => {
            const m = part.definition.stats.mass + (part.definition.stats.fuel || 0);
            const px = part.position.x || 0;
            const py = part.position.y || 0;
            const pos = new Vector2(px, py);

            const rSq = pos.distanceToSquared(this.centerOfMass);

            // Approximate part as point mass + small intrinsic inertia
            // Box inertia: m * (w^2 + h^2) / 12
            const w = part.definition.width;
            const h = part.definition.height;
            const intrinsic = m * (w * w + h * h) / 12;

            inertia += m * rSq + intrinsic;
        });

        this.momentOfInertia = inertia;

        // Debug
        // console.log(`Mass Props: Mass=${totalMass}, CoM=(${this.centerOfMass.x.toFixed(2)}, ${this.centerOfMass.y.toFixed(2)}), I=${inertia.toFixed(0)}`);
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
            // If part is decoupler, it gets its OWN stage
            if (part.definition.type === 'decoupler') {
                // Push current stage (parts below decoupler)
                if (currentStage.length > 0) {
                    this.stages.push(currentStage);
                    currentStage = [];
                }
                // Decoupler in its own stage
                this.stages.push([part]);
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

        // Initialize fuel on each tank part
        this.stages.forEach(stage => {
            stage.forEach(part => {
                if (part.definition.type === 'tank' && part.definition.stats.fuel) {
                    part.currentFuel = part.definition.stats.fuel;
                }
            });
        });



    }

    /**
     * Consume fuel from tanks in the current active stage
     * Returns the amount of fuel consumed
     */
    consumeFuelFromActiveStage(throttle: number, deltaTime: number): number {
        if (!this.stages || this.currentStageIndex >= this.stages.length) return 0;

        // Get tanks from current stage
        const currentStage = this.stages[this.currentStageIndex];
        const tanks = currentStage.filter(p => p.definition.type === 'tank' && (p.currentFuel ?? 0) > 0);

        // If no fuel in current stage and crossfeed is enabled, try next stages
        if (tanks.length === 0 && this.crossfeedEnabled) {
            for (let i = this.currentStageIndex + 1; i < this.stages.length; i++) {
                const stageTanks = this.stages[i].filter(p => p.definition.type === 'tank' && (p.currentFuel ?? 0) > 0);
                if (stageTanks.length > 0) {
                    tanks.push(...stageTanks);
                    break; // Only use first stage with fuel
                }
            }
        }

        if (tanks.length === 0) return 0;

        // Calculate mass flow rate: thrust / (ISP * g0)
        const thrust = this.engine.getThrust(throttle);
        const massFlowRate = thrust / (this.engine.isp * 9.81);
        const totalConsumption = massFlowRate * deltaTime;

        // Distribute consumption evenly across tanks with fuel
        const consumptionPerTank = totalConsumption / tanks.length;
        let actualConsumed = 0;

        tanks.forEach(tank => {
            const available = tank.currentFuel ?? 0;
            const consumed = Math.min(available, consumptionPerTank);
            tank.currentFuel = available - consumed;
            actualConsumed += consumed;
        });

        return actualConsumed;
    }

    /**
     * Check if there's fuel available in active stage (or with crossfeed if enabled)
     */
    hasFuelInActiveStage(): boolean {
        if (!this.stages || this.currentStageIndex >= this.stages.length) return false;

        // Check current stage tanks first
        const currentStageHasFuel = this.stages[this.currentStageIndex].some(p =>
            p.definition.type === 'tank' && (p.currentFuel ?? 0) > 0.01
        );
        if (currentStageHasFuel) return true;

        // If crossfeed enabled, check upper stages
        if (this.crossfeedEnabled) {
            for (let i = this.currentStageIndex + 1; i < this.stages.length; i++) {
                const hasFuel = this.stages[i].some(p =>
                    p.definition.type === 'tank' && (p.currentFuel ?? 0) > 0.01
                );
                if (hasFuel) return true;
            }
        }

        return false;
    }

    /**
     * Get total fuel remaining across all attached stages
     */
    getTotalFuel(): number {
        if (!this.stages) return 0;

        let totalFuel = 0;
        for (let i = this.currentStageIndex; i < this.stages.length; i++) {
            this.stages[i].forEach(p => {
                if (p.definition.type === 'tank') {
                    totalFuel += p.currentFuel ?? 0;
                }
            });
        }
        return totalFuel;
    }

    /**
     * Get total fuel capacity across all attached stages
     */
    getTotalFuelCapacity(): number {
        if (!this.stages) return 0;

        let totalCapacity = 0;
        for (let i = this.currentStageIndex; i < this.stages.length; i++) {
            this.stages[i].forEach(p => {
                if (p.definition.type === 'tank' && p.definition.stats.fuel) {
                    totalCapacity += p.definition.stats.fuel;
                }
            });
        }
        return totalCapacity;
    }

    /**
     * Get total fuel percent remaining across all attached stages
     */
    getTotalFuelPercent(): number {
        const capacity = this.getTotalFuelCapacity();
        if (capacity === 0) return 0;
        return (this.getTotalFuel() / capacity) * 100;
    }

    /**
     * Activate next stage (decouple)
     */
    activateStage() {
        // If we are at the last stage (payload), nothing to decouple
        if (this.currentStageIndex >= this.stages.length - 1) {
            return;
        }

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
    public recalculateStats() {
        let newDryMass = 0;
        let newFuelMass = 0;
        let newThrust = 0;
        let totalIspWeighted = 0;
        let newMaxElectricity = 0;

        // Iterate over remaining stages
        for (let i = this.currentStageIndex; i < this.stages.length; i++) {
            const stage = this.stages[i];
            stage.forEach(p => {
                const def = p.definition;
                newDryMass += def.stats.mass;
                newFuelMass += def.stats.fuel || 0;

                if ((def.type === 'engine' || def.type === 'booster') && def.stats.thrust) {
                    newThrust += def.stats.thrust;
                    totalIspWeighted += (def.stats.isp || 0) * def.stats.thrust;
                }

                // Sum up electricity capacity
                if (def.stats.electricity) {
                    newMaxElectricity += def.stats.electricity;
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

        // Recalculate CoM and Inertia
        this.calculateMassProperties();

        // Update electricity capacity
        // If max capacity dropped (e.g. stage separation), cap current charge
        this.maxElectricity = newMaxElectricity;
        if (this.electricity > this.maxElectricity) {
            this.electricity = this.maxElectricity;
        }
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
     * Get total width of rocket (including boosters)
     */
    getTotalWidth(): number {
        if (this.partStack && this.partStack.length > 0) {
            const positionsX = this.partStack.map(p => p.position.x || 0);
            const widths = this.partStack.map(p => p.definition.width || 0);
            const minX = Math.min(...positionsX.map((x, i) => x - widths[i] / 2));
            const maxX = Math.max(...positionsX.map((x, i) => x + widths[i] / 2));
            return maxX - minX;
        }
        return this.width;
    }

    /**
     * Get rocket info for UI display
     */
    getInfo() {
        return {
            fuel: this.getTotalFuelPercent(),
            deltaV: this.engine.getDeltaV(this.dryMass),
            mass: this.body.mass,
            throttle: this.controls.getThrottle(),
            velocity: this.body.velocity.mag(),
            altitude: 0, // Will be calculated by game based on nearest body
            infiniteFuel: this.engine.infiniteFuel,
            electricity: this.electricity,
            maxElectricity: this.maxElectricity
        };
    }

    /**
     * Deploy parachutes
     */
    deployParachute() {
        if (!this.partStack) return;

        let deployedAny = false;
        this.partStack.forEach(p => {
            if (p.definition.type === 'parachute' && !p.deployed) {
                p.deployed = true;
                // Keep it active for visual updates if needed
                p.active = true;
                deployedAny = true;
            }
        });

        if (deployedAny) {
            console.log('Parachutes deployed!');
            this.meshVersion++; // Trigger visual update
        }
    }

    /**
     * Eject fairings - creates debris for each fairing half
     */
    ejectFairings() {
        if (!this.partStack) return;

        // Find all fairing parts
        const fairings = this.partStack.filter(p => p.definition.type === 'fairing');
        if (fairings.length === 0) return;

        // FIRST: Remove fairings and recalculate stats so collision radius shrinks
        // This must happen BEFORE creating debris to avoid debris spawning inside rocket's collision sphere
        this.partStack = this.partStack.filter(p => p.definition.type !== 'fairing');
        this.stages = this.stages.map(stage =>
            stage.filter(p => p.definition.type !== 'fairing')
        );
        this.recalculateStats();
        this.meshVersion++;

        // NOW create debris (rocket collision radius is now smaller)
        fairings.forEach((fairing) => {
            const debrisMass = fairing.definition.stats.mass / 2;
            const ejectionSpeed = 2; // m/s latéral - lent

            // LEFT half - part vers la gauche du rocket
            const leftAngle = this.rotation + Math.PI / 2;
            const leftDir = new Vector2(Math.cos(leftAngle), Math.sin(leftAngle));

            // Calculate spawn position above the rocket's collision circle
            // After recalculateStats(), this.body.radius is the new half-height without fairing
            // Debris should spawn above this radius to avoid collision
            const rocketDir = new Vector2(Math.cos(this.rotation), Math.sin(this.rotation));


            // Also account for fairing height (debris visual extends beyond collision circle)
            const fairingHalfHeight = (fairing.definition.height || 4) / 2;

            // Spawn distance from rocket center = rocket radius + fairing half-height + margin
            const spawnDistance = this.body.radius + fairingHalfHeight + 13.0;

            // Spawn at top of rocket (in direction rocket is pointing) plus lateral offset
            const spawnBasePos = this.body.position.add(rocketDir.scale(spawnDistance));

            // Offset left debris to the left (use full width to properly separate them)
            const lateralOffset = (fairing.definition.width || 2);
            const leftSpawnPos = spawnBasePos.add(leftDir.scale(lateralOffset));

            // Reset part position to (0,0) so mesh centers on the part
            const leftPart = {
                ...fairing,
                position: new Vector2(0, 0),
                definition: {
                    ...fairing.definition,
                    visual: { ...fairing.definition.visual, textureRight: undefined }
                }
            };

            // Debris spawns at fairing position with left offset
            const leftDebris = new Debris(
                leftSpawnPos,
                this.body.velocity.add(leftDir.scale(ejectionSpeed)),
                debrisMass,
                [leftPart],
                60 // 60 seconds lifetime
            );
            leftDebris.angularVelocity = 0.1;
            leftDebris.rotation = this.rotation;
            leftDebris.acceleration = this.body.acceleration.clone();

            if (this.onStageSeparation) {
                this.onStageSeparation(leftDebris);
            }

            // RIGHT half - part vers la droite du rocket
            const rightAngle = this.rotation - Math.PI / 2;
            const rightDir = new Vector2(Math.cos(rightAngle), Math.sin(rightAngle));

            // Offset right debris to the right (use same spawnBasePos and lateralOffset)
            const rightSpawnPos = spawnBasePos.add(rightDir.scale(lateralOffset));

            // Reset part position to (0,0) so mesh centers on the part
            const rightPart = {
                ...fairing,
                position: new Vector2(0, 0),
                definition: {
                    ...fairing.definition,
                    visual: { ...fairing.definition.visual, textureLeft: undefined }
                }
            };

            // Debris spawns at fairing position with right offset
            const rightDebris = new Debris(
                rightSpawnPos,
                this.body.velocity.add(rightDir.scale(ejectionSpeed)),
                debrisMass,
                [rightPart],
                60 // 60 seconds lifetime
            );
            rightDebris.angularVelocity = -0.1;
            rightDebris.rotation = this.rotation;
            // Copy acceleration to prevent initial teleportation
            rightDebris.acceleration = this.body.acceleration.clone();


            if (this.onStageSeparation) {
                this.onStageSeparation(rightDebris);
            }
        });
    }

    /**
     * Apply atmospheric drag
     */
    private applyDrag(_dt: number, bodies: Body[]) {
        // Find nearest body with atmosphere
        let nearestBody: Body | null = null;
        let minDist = Infinity;

        // Optimization: Check only if possibly close enough
        for (const body of bodies) {
            if (!body.atmosphereHeight) continue;

            const dist = this.body.position.distanceTo(body.position);

            const PLANET_SCALE = 3.0; // Matching SceneSetup
            const visualRadius = body.radius * PLANET_SCALE;

            // Check if within atmosphere + VISUAL radius
            if (dist < visualRadius + body.atmosphereHeight) {
                if (dist < minDist) {
                    minDist = dist;
                    nearestBody = body;
                }
            }
        }

        if (!nearestBody) return;

        // Calculate altitude
        // CRITICAL FIX: Planets are rendered and collided at 3.0x Scale (SceneSetup.ts)
        // But body.radius is the physical 1.0x radius.
        // We must subtract the VISUAL radius to get the true altitude above the terrain.
        const PLANET_SCALE = 3.0; // Must match SceneSetup.ts and CollisionManager
        const altitude = minDist - (nearestBody.radius * PLANET_SCALE);

        // At 2km visual alt: Dist = 3*R + 2000. 
        // Old calc: Alt = (3*R + 2000) - R = 2*R + 2000 => Space.
        // New calc: Alt = (3*R + 2000) - 3*R = 2000 => Atmosphere!

        if (altitude < 0) return; // Underground

        // Get density
        const rho = nearestBody.getAtmosphericDensity(altitude);
        if (rho <= 0.000001) {
            // Fix: Check for undefined atmosphereHeight safely
            if (altitude < (nearestBody.atmosphereHeight || 0) && Math.random() < 0.01) {
                console.log(`[Physics] Rho Zero! Alt: ${altitude}, Falloff: ${nearestBody.atmosphereFalloff}`);
            }
            return;
        }



        const relVel = this.body.velocity.sub(nearestBody.velocity);
        const speed = relVel.mag();

        if (speed < 0.1) return;

        // Drag Equation: Fd = 0.5 * rho * v^2 * Cd * A

        // Calculate Cd and Area
        let Cd = 0.2; // Streamlined rocket default
        // Area (Cross Section)
        let area = Math.PI * (this.width / 2) * (this.width / 2); // ~7 m^2

        // Modifiers based on parts (e.g. Parachute, Fairing)
        if (this.partStack) {
            // Check if any parachute is active
            let parachuteDeployed = false;
            let totalDragReduction = 0;

            this.partStack.forEach(p => {
                // BUG FIX: Check .deployed instead of .active
                // .active is reset every frame for engines/RCS. Parachutes set .deployed persistently.
                if (p.definition.type === 'parachute' && p.deployed) {
                    parachuteDeployed = true;
                }

                // Check for fairings - they reduce drag
                if (p.definition.type === 'fairing' && p.definition.stats.dragReduction) {
                    totalDragReduction = Math.max(totalDragReduction, p.definition.stats.dragReduction);
                }
            });

            if (parachuteDeployed) {
                Cd = 1.5; // High drag
                area = 50; // Big parachute area (approx 8m diameter)
            } else if (totalDragReduction > 0) {
                // Apply fairing drag reduction
                Cd = Cd * (1 - totalDragReduction);
            }
        }

        // BOOST DRAG FOR GAMEPLAY FEEL
        // Physics is correct, but at this scale it feels too weak.
        // Multiply by factor to make it noticeable.
        // User feedback: "Can't takeoff with 500.0". Reducing to 20.0.
        const dragMultiplier = 20.0;
        const dragMag = 0.5 * rho * speed * speed * Cd * area * dragMultiplier;

        // Direction is opposite to relative velocity
        const dragDir = relVel.normalize().scale(-1);
        const dragForce = dragDir.scale(dragMag);

        // Apply drag directly to body velocity logic to avoid coordinate confusion
        // F = ma -> a = F/m
        const dragAccel = dragForce.scale(1 / this.body.mass);

        // Apply to velocity immediately (Euler integration step for drag)
        this.body.velocity.addInPlace(dragAccel.scale(_dt));

        // ----------------------------------------
        // AERODYNAMIC TORQUE (Pendulum Effect)
        // ----------------------------------------
        // Apply torque based on where the drag force is applied (Center of Pressure vs Center of Mass)
        // If parachute is deployed, Drag Center is high up (at the parachute).
        // If falling, Drag is Up, CoP is Top => Pulls top up => Stable.

        // Determine Center of Pressure (Local Frame)
        // Simple approximation:
        // If Parachute: Top of rocket.
        // If Normal: Middle of rocket (approximate).

        let centerOfPressureY = 0; // Local Y relative to rocket center

        // Check parachute state from earlier check
        let isParachuteDeployed = false;
        if (this.partStack) {
            // Re-check or reuse? Let's re-use logic but make variable clear
            isParachuteDeployed = this.partStack.some(p => p.definition.type === 'parachute' && p.deployed);
        }

        if (isParachuteDeployed) {
            // CoP is at the top of the rocket (approx parachute attach point)
            centerOfPressureY = this.getTotalHeight() / 2;
        } else {
            // Standard aerodynamic stability
            // For a rocket, CoP is usually lower than CoM for stability? 
            // Actually fins put CoP low.
            // Let's assume CoP is slightly below geometric center for a standard rocket with fins?
            // Or just use CoM to avoid unwanted rotation if we don't simulate full aero.
            // For this requested feature ("influence rotation"), let's only apply significant torque if Parachute is out.
            // Or if user wants "drag stabilizes rocket" generally.
            // Let's stick to Parachute for now as requested.
            centerOfPressureY = this.centerOfMass.y; // Neutral
        }

        if (isParachuteDeployed) {
            // Calculate Moment Arm in World Space
            // Arm_local = CoP - CoM
            // CoP_local = (0, centerOfPressureY)
            const armLocal = new Vector2(0 - this.centerOfMass.x, centerOfPressureY - this.centerOfMass.y);

            // Rotate Arm to World orientation
            // Rocket Angle = this.rotation
            // Vector (x, y) rotates by theta:
            // x' = x cos - y sin
            // y' = x sin + y cos
            // Note: Our rotation definition might be PI/2 offset logic.
            // this.rotation is angle of Vertical axis?
            // In update(): angle = this.rotation - Math.PI / 2;
            // Let's use the same transform as visuals.
            const angle = this.rotation - Math.PI / 2;
            const ax = armLocal.x * Math.cos(angle) - armLocal.y * Math.sin(angle);
            const ay = armLocal.x * Math.sin(angle) + armLocal.y * Math.cos(angle);
            const armWorld = new Vector2(ax, ay);

            // Torque = r x F (2D cross product)
            // T = rx * Fy - ry * Fx
            // dragForce is in World frame
            const torque = armWorld.x * dragForce.y - armWorld.y * dragForce.x;

            // Apply angular acceleration
            // alpha = T / I
            const alpha = torque / Math.max(1, this.momentOfInertia);
            this.angularVelocity += alpha * _dt;

            // console.log(`Drag Torque: ${torque.toFixed(0)}, Alpha: ${alpha.toFixed(3)}`);
        }

        // Debug logging for atmosphere entry
        if (rho > 0.01 && this.body.velocity.mag() > 50) {
            // console.log(`Drag Applied: ${dragMag.toFixed(0)}N, Accel=${dragAccel.mag().toFixed(2)} m/s2`);
        }

        // Debug logging for atmosphere entry?
        // Debug logging for atmosphere entry?
        if (rho > 0.01 && this.body.velocity.mag() > 100) {
            // console.log(`In Atmosphere: Alt=${altitude.toFixed(0)}m, Rho=${rho.toFixed(4)}, Drag=${dragMag.toFixed(0)}N`);
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.controls.dispose();
    }
}
