/**
 * RocketEngine - Manages thrust, fuel consumption, and propulsion
 */
export class RocketEngine {
    maxThrust: number;      // Maximum thrust in Newtons
    fuelCapacity: number;   // Total fuel capacity in kg
    currentFuel: number;
    isp: number; // Specific Impulse in seconds
    infiniteFuel: boolean = false;

    constructor(maxThrust: number, fuelCapacity: number, isp: number) {
        this.maxThrust = maxThrust;
        this.fuelCapacity = fuelCapacity;
        this.currentFuel = fuelCapacity;
        this.isp = isp;
    }

    /**
     * Calculate thrust based on throttle (0-1)
     */
    getThrust(throttle: number): number {
        return this.maxThrust * Math.max(0, Math.min(1, throttle));
    }

    /**
     * Consume fuel based on throttle and time
     * Returns mass of fuel consumed
     */
    consumeFuel(throttle: number, deltaTime: number): number {
        if (this.currentFuel <= 0) return 0;
        if (this.infiniteFuel) return 0;

        // Mass flow rate = Thrust / (Isp * g0)
        // g0 = 9.81 m/s^2 (standard gravity)
        const thrust = this.getThrust(throttle);
        const massFlowRate = thrust / (this.isp * 9.81);

        const consumed = massFlowRate * deltaTime;
        this.currentFuel = Math.max(0, this.currentFuel - consumed);

        return consumed;
    }

    /**
     * Check if engine has fuel
     */
    hasFuel(): boolean {
        return this.currentFuel > 0.01; // Small threshold to avoid floating point issues
    }

    /**
     * Get fuel percentage remaining
     */
    getFuelPercent(): number {
        return (this.currentFuel / this.fuelCapacity) * 100;
    }

    /**
     * Calculate delta-V remaining (change in velocity possible)
     * Using Tsiolkovsky rocket equation: ΔV = Isp * g0 * ln(m0/mf)
     */
    getDeltaV(dryMass: number): number {
        const g0 = 9.81;
        const wetMass = dryMass + this.currentFuel;
        if (wetMass <= dryMass) return 0;
        return this.isp * g0 * Math.log(wetMass / dryMass);
    }
}
