import { Vector2 } from '../core/Vector2';
import { Debris } from './Debris';

/**
 * Part type used by StagingManager
 */
export interface StagePart {
    partId: string;
    definition: {
        type: string;
        width: number;
        height: number;
        stats: {
            mass: number;
            fuel?: number;
            thrust?: number;
            isp?: number;
            electricity?: number;
            [key: string]: any;
        };
        [key: string]: any;
    };
    position: { x: number; y: number };
    rotation?: number;
    flipped?: boolean;
    active?: boolean;
    deployed?: boolean;
    manualEnabled?: boolean;
    currentFuel?: number;
    [key: string]: any;
}

/**
 * Stage type - array of parts
 */
export type Stage = StagePart[];

/**
 * Result of stage stats calculation
 */
export interface StageStats {
    dryMass: number;
    fuelMass: number;
    thrust: number;
    avgIsp: number;
    maxElectricity: number;
}

/**
 * StagingManager - Handles stage initialization and stats calculation
 * Extracted from Rocket.ts for maintainability
 */
export class StagingManager {

    /**
     * Parse parts into stages based on decouplers
     * Returns stages array where stage[0] is bottom-most (first to drop)
     */
    parseStages(parts: StagePart[]): Stage[] {
        const stages: Stage[] = [];
        let currentStage: StagePart[] = [];

        // Sort Bottom to Top
        const bottomUpParts = [...parts].sort((a, b) => a.position.y - b.position.y);

        for (const part of bottomUpParts) {
            // If part is decoupler, it gets its OWN stage
            if (part.definition.type === 'decoupler') {
                // Push current stage (parts below decoupler)
                if (currentStage.length > 0) {
                    stages.push(currentStage);
                    currentStage = [];
                }
                // Decoupler in its own stage
                stages.push([part]);
            } else {
                currentStage.push(part);
            }
        }

        // Push remaining parts (Payload)
        if (currentStage.length > 0) {
            stages.push(currentStage);
        }

        return stages;
    }

    /**
     * Initialize fuel on all tank parts
     */
    initializeFuel(stages: Stage[]): void {
        stages.forEach(stage => {
            stage.forEach(part => {
                if (part.definition.type === 'tank' && part.definition.stats.fuel) {
                    part.currentFuel = part.definition.stats.fuel;
                }
            });
        });
    }

    /**
     * Calculate stats for remaining stages (from currentStageIndex onwards)
     */
    calculateStats(stages: Stage[], currentStageIndex: number): StageStats {
        let dryMass = 0;
        let fuelMass = 0;
        let thrust = 0;
        let totalIspWeighted = 0;
        let maxElectricity = 0;

        for (let i = currentStageIndex; i < stages.length; i++) {
            const stage = stages[i];
            stage.forEach(p => {
                const def = p.definition;
                dryMass += def.stats.mass;
                fuelMass += def.stats.fuel || 0;

                if ((def.type === 'engine' || def.type === 'booster') && def.stats.thrust) {
                    thrust += def.stats.thrust;
                    totalIspWeighted += (def.stats.isp || 0) * def.stats.thrust;
                }

                if (def.stats.electricity) {
                    maxElectricity += def.stats.electricity;
                }
            });
        }

        const avgIsp = thrust > 0 ? totalIspWeighted / thrust : 0;

        return { dryMass, fuelMass, thrust, avgIsp, maxElectricity };
    }

    /**
     * Flatten remaining stages into a single part array
     */
    flattenRemainingStages(stages: Stage[], currentStageIndex: number): StagePart[] {
        const parts: StagePart[] = [];
        for (let i = currentStageIndex; i < stages.length; i++) {
            parts.push(...stages[i]);
        }
        return parts;
    }

    /**
     * Create debris from a dropped stage
     */
    createDebris(
        stageToDrop: Stage,
        rocketPosition: Vector2,
        rocketVelocity: Vector2,
        rocketRotation: number,
        separationDist: number
    ): Debris {
        // Calculate properties of dropped stage
        let debrisMass = 0;
        stageToDrop.forEach(p => {
            debrisMass += p.definition.stats.mass + (p.definition.stats.fuel || 0);
        });

        // Calculate separation offset (below rocket)
        const separationOffset = new Vector2(
            Math.cos(rocketRotation + Math.PI) * separationDist,
            Math.sin(rocketRotation + Math.PI) * separationDist
        );

        const debrisPos = rocketPosition.add(separationOffset);

        // Create debris entity
        const debris = new Debris(
            debrisPos,
            rocketVelocity.clone(),
            debrisMass,
            stageToDrop
        );

        // Add separation velocity
        const separationDir = new Vector2(
            Math.cos(rocketRotation + Math.PI),
            Math.sin(rocketRotation + Math.PI)
        );
        debris.velocity = debris.velocity.add(separationDir.scale(5));

        // Add random rotation
        debris.angularVelocity = (Math.random() - 0.5) * 2;
        debris.rotation = rocketRotation;

        return debris;
    }

    /**
     * Check if a part is in the current active stage
     */
    isPartInActiveStage(
        part: { partId: string; position: { x: number; y: number } },
        stages: Stage[],
        currentStageIndex: number
    ): boolean {
        if (!stages || stages.length === 0) return true;

        const currentStage = stages[currentStageIndex];
        if (!currentStage) return false;

        const EPSILON = 0.001;

        for (const stagePart of currentStage) {
            const dx = Math.abs(stagePart.position.x - (part.position.x || 0));
            const dy = Math.abs(stagePart.position.y - (part.position.y || 0));
            if (dx < EPSILON && dy < EPSILON && stagePart.partId === part.partId) {
                return true;
            }
        }

        return false;
    }
}
