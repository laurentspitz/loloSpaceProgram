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

    // Visual properties
    readonly capsuleHeight: number = 3;
    readonly tankHeight: number = 8;
    readonly engineHeight: number = 4;
    readonly width: number = 2;

    constructor(position: Vector2, velocity: Vector2) {
        // Rocket specifications (Heavy lifter)
        const fuelMass = 500000; // kg of fuel (Increased 100x from original)
        this.dryMass = 5000;    // kg dry mass (structure + engine + capsule)
        const totalMass = this.dryMass + fuelMass;

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

        // Create engine (5MN thrust, 500t fuel, 350s ISP - similar to Falcon 9 / Heavy)
        this.engine = new RocketEngine(5000000, fuelMass, 350);

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
