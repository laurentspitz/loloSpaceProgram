import { Rocket } from '../entities/Rocket';
import type { PartType } from '../hangar/PartDefinition';

/**
 * Represents an item within a stage
 */
export interface StageItem {
    partId: string;           // Part ID (e.g., 'engine-r7-rd108')
    instanceId: string;       // Unique instance ID
    type: PartType;           // Part type
    name: string;             // Display name

    // State
    active?: boolean;         // Engine on/off
    fuelPercent?: number;     // Fuel gauge (for tanks)
    fuelCurrent?: number;     // Current fuel (kg)
    fuelMax?: number;         // Max fuel (kg)
    deployed?: boolean;       // Fairing/parachute deployed

    // Engine stats
    thrust?: number;          // Engine thrust (N)
    isp?: number;             // Engine ISP
}

/**
 * Represents a stage grouping parts
 */
export interface Stage {
    index: number;            // Stage index (0 = bottom/first to activate)
    items: StageItem[];       // Parts in this stage
    isActive: boolean;        // Is this the current stage?
    isSeparated: boolean;     // Has this stage been separated?
}

/**
 * StagingSystem - Manages staging information and actions
 */
export class StagingSystem {
    private rocket: Rocket | null = null;

    /**
     * Attach to a rocket
     */
    setRocket(rocket: Rocket | null) {
        this.rocket = rocket;
    }

    /**
     * Get staging info from the rocket
     */
    getStages(): Stage[] {
        if (!this.rocket || !this.rocket.stages) return [];

        const stages: Stage[] = [];

        for (let i = 0; i < this.rocket.stages.length; i++) {
            const stageparts = this.rocket.stages[i];
            const isSeparated = i < this.rocket.currentStageIndex;
            const isActive = i === this.rocket.currentStageIndex;

            const items: StageItem[] = stageparts.map((part, idx) => {
                const def = part.definition;
                const item: StageItem = {
                    partId: part.partId,
                    instanceId: `${part.partId}-${i}-${idx}`,
                    type: def.type as PartType,
                    name: def.name || part.partId,
                    active: part.active,
                    deployed: part.deployed,
                };

                // Tank fuel info - use per-tank fuel tracking
                if (def.type === 'tank' && def.stats.fuel) {
                    const maxFuel = def.stats.fuel;
                    const currentFuel = part.currentFuel ?? maxFuel;
                    item.fuelMax = maxFuel;
                    item.fuelCurrent = currentFuel;
                    item.fuelPercent = (currentFuel / maxFuel) * 100;
                }

                // Engine stats
                if ((def.type === 'engine' || def.type === 'booster') && def.stats.thrust) {
                    item.thrust = def.stats.thrust;
                    item.isp = def.stats.isp;
                }

                return item;
            });

            stages.push({
                index: i,
                items,
                isActive,
                isSeparated
            });
        }

        return stages;
    }

    /**
     * Get current active stage index
     */
    getCurrentStageIndex(): number {
        return this.rocket?.currentStageIndex ?? 0;
    }

    /**
     * Get total number of stages
     */
    getStageCount(): number {
        return this.rocket?.stages?.length ?? 0;
    }

    /**
     * Activate next stage (decouple)
     */
    activateNextStage(): boolean {
        if (!this.rocket) return false;

        const prevIndex = this.rocket.currentStageIndex;
        this.rocket.activateStage();
        return this.rocket.currentStageIndex !== prevIndex;
    }

    /**
     * Toggle an engine on/off
     * Finds the part by instanceId and sets its manual enabled state
     */
    toggleEngine(instanceId: string, on: boolean): void {
        if (!this.rocket || !this.rocket.partStack) {
            console.log(`[StagingSystem] No rocket or partStack`);
            return;
        }

        // Parse instanceId: format is "partId-stageIndex-itemIndex"
        const parts = instanceId.split('-');
        if (parts.length < 3) {
            console.log(`[StagingSystem] Invalid instanceId format: ${instanceId}`);
            return;
        }

        const stageIndex = parseInt(parts[parts.length - 2]);
        const itemIndex = parseInt(parts[parts.length - 1]);

        // Find the part in stages
        if (this.rocket.stages && this.rocket.stages[stageIndex]) {
            const stage = this.rocket.stages[stageIndex];
            if (stage[itemIndex]) {
                const part = stage[itemIndex];
                // Set manualEnabled state (undefined means use auto/throttle control)
                part.manualEnabled = on;
                console.log(`[StagingSystem] Engine ${part.partId} manual state set to ${on}`);
            }
        }
    }

    /**
     * Activate a specific decoupler
     */
    activateDecoupler(instanceId: string): void {
        // For now, decoupling activates the next stage
        // Individual decoupler control would require more complex implementation
        console.log(`[StagingSystem] Activate decoupler ${instanceId}`);
        this.activateNextStage();
    }

    /**
     * Eject fairing
     */
    ejectFairing(): void {
        if (!this.rocket) return;
        // Trigger fairing ejection through the controls
        this.rocket.ejectFairings();
    }

    /**
     * Deploy parachutes
     */
    deployParachute(): void {
        if (!this.rocket) return;
        this.rocket.deployParachute();
    }

    /**
     * Reorder stages (for hangar use)
     */
    reorderStages(newOrder: number[]): void {
        if (!this.rocket || !this.rocket.stages) return;

        const reordered = newOrder.map(i => this.rocket!.stages[i]);
        this.rocket.stages = reordered;
        console.log(`[StagingSystem] Stages reordered:`, newOrder);
    }
}

// Singleton instance
export const stagingSystem = new StagingSystem();
