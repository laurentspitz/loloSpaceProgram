import type { PartStats } from './PartDefinition';
import { Vector2 } from '../core/Vector2';
import { PartRegistry } from './PartRegistry';

export interface PlacedPart {
    instanceId: string;
    partId: string;
    position: Vector2; // Hangar coordinates
    rotation: number;  // Radians
    attachedTo?: string; // instanceId of parent part
    flipped?: boolean;
}

export class RocketAssembly {
    parts: PlacedPart[] = [];
    rootPartId: string | null = null;
    public name: string = "Untitled Rocket";

    constructor() {
        // PartRegistry.init() should be called at app startup
    }

    addPart(partId: string, position: Vector2, rotation: number = 0, flipped: boolean = false): PlacedPart {
        const def = PartRegistry.get(partId);
        if (!def) throw new Error(`Part ${partId} not found`);

        const instanceId = Math.random().toString(36).substr(2, 9);
        const newPart: PlacedPart = {
            instanceId,
            partId,
            position,
            rotation,
            flipped
        };

        if (this.parts.length === 0) {
            this.rootPartId = instanceId;
        }

        this.parts.push(newPart);
        return newPart;
    }

    removePart(instanceId: string) {
        this.parts = this.parts.filter(p => p.instanceId !== instanceId);
        if (this.rootPartId === instanceId) {
            this.rootPartId = this.parts.length > 0 ? this.parts[0].instanceId : null;
        }
    }

    getStats(): PartStats {
        let totalMass = 0;
        let totalCost = 0;
        let totalFuel = 0;
        let maxThrust = 0;
        let totalIspWeighted = 0;

        this.parts.forEach(p => {
            const def = PartRegistry.get(p.partId);
            if (!def) return;

            totalMass += def.stats.mass + (def.stats.fuel || 0);
            totalCost += def.stats.cost;
            totalFuel += def.stats.fuel || 0;

            if (def.type === 'engine' && def.stats.thrust) {
                maxThrust += def.stats.thrust;
                // Simplified ISP averaging (should be thrust weighted)
                totalIspWeighted += (def.stats.isp || 0) * def.stats.thrust;
            }
        });

        const avgIsp = maxThrust > 0 ? totalIspWeighted / maxThrust : 0;

        return {
            mass: totalMass,
            cost: totalCost,
            fuel: totalFuel,
            thrust: maxThrust,
            isp: avgIsp
        };
    }

    /**
     * Calculate Delta V using Tsiolkovsky rocket equation
     * dV = Isp * g0 * ln(m0 / mf)
     */
    calculateDeltaV(): number {
        const stats = this.getStats();
        if (stats.mass === 0 || stats.fuel === 0 || stats.isp === 0) return 0;

        const g0 = 9.81;
        const m0 = stats.mass; // Wet mass
        const mf = stats.mass - stats.fuel!; // Dry mass

        return stats.isp! * g0 * Math.log(m0 / mf);
    }

    /**
     * Get rocket configuration for game
     */
    getRocketConfig() {
        const stats = this.getStats();
        const dryMass = stats.mass - (stats.fuel || 0);

        return {
            dryMass,
            fuelMass: stats.fuel || 0,
            totalMass: stats.mass,
            thrust: stats.thrust || 0,
            isp: stats.isp || 300,
            parts: this.getPartStack()
        };
    }

    /**
     * Get ordered part stack from bottom to top for rendering
     */
    getPartStack() {
        if (this.parts.length === 0) return [];

        // Sort parts by Y position (bottom to top)
        const sorted = [...this.parts].sort((a, b) => a.position.y - b.position.y);

        return sorted.map(p => {
            const def = PartRegistry.get(p.partId);
            return {
                partId: p.partId,
                definition: def!,
                position: p.position,
                rotation: p.rotation,
                flipped: p.flipped
            };
        });
    }
}

