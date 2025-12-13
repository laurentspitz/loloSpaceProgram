import { RocketEngine } from './RocketEngine';

/**
 * Part type used by FuelSystem
 */
export interface FuelPart {
    partId: string;
    definition: {
        type: string;
        stats: {
            mass: number;
            fuel?: number;
            [key: string]: any;
        };
        [key: string]: any;
    };
    position: { x: number; y: number };
    currentFuel?: number;
    [key: string]: any;
}

/**
 * Stage type - array of parts
 */
export type Stage = FuelPart[];

/**
 * FuelSystem - Manages fuel consumption and tracking across rocket stages
 * Extracted from Rocket.ts for maintainability
 */
export class FuelSystem {
    private stages: Stage[] = [];
    private currentStageIndex: number = 0;
    private crossfeedEnabled: boolean = false;
    private engine: RocketEngine;

    constructor(engine: RocketEngine) {
        this.engine = engine;
    }

    /**
     * Update references from Rocket (called when stages change)
     */
    setStages(stages: Stage[], currentStageIndex: number, crossfeedEnabled: boolean) {
        this.stages = stages;
        this.currentStageIndex = currentStageIndex;
        this.crossfeedEnabled = crossfeedEnabled;
    }

    /**
     * Update engine reference (after stage separation)
     */
    setEngine(engine: RocketEngine) {
        this.engine = engine;
    }

    /**
     * Update current stage index
     */
    setCurrentStageIndex(index: number) {
        this.currentStageIndex = index;
    }

    /**
     * Initialize fuel on all tank parts
     */
    initializeFuel(stages: Stage[]) {
        stages.forEach(stage => {
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
    consumeFuel(throttle: number, deltaTime: number): number {
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
    hasFuel(): boolean {
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
    getTotalCapacity(): number {
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
    getTotalPercent(): number {
        const capacity = this.getTotalCapacity();
        if (capacity === 0) return 0;
        return (this.getTotalFuel() / capacity) * 100;
    }
}
