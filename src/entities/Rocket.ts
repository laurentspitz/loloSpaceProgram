import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { RocketEngine } from './RocketEngine';
import { RocketControls } from './RocketControls';

/**
 * Rocket - Main rocket class using composition pattern
 * Contains a Body for physics, Engine for propulsion, and Controls for input
 */
export class Rocket {
    body: Body;
    engine: RocketEngine;
    controls: RocketControls;

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
    partStack?: Array<{ partId: string; definition: any; position: any }>;

    constructor(position: Vector2, velocity: Vector2, assemblyConfig?: any) {
        // Use assembly config if provided, otherwise use defaults
        const fuelMass = assemblyConfig?.fuelMass || 500000;
        this.dryMass = assemblyConfig?.dryMass || 5000;
        const totalMass = this.dryMass + fuelMass;
        const thrust = assemblyConfig?.thrust || 5000000;
        const isp = assemblyConfig?.isp || 350;

        // Store part stack for rendering
        this.partStack = assemblyConfig?.parts;

        // Create physics body
        // Radius is approximate for collision detection
        const radius = 2; // meters
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
    }

    /**
     * Get total height of rocket for rendering
     */
    getTotalHeight(): number {
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
