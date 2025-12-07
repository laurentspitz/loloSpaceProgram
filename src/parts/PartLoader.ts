import type { BasePart } from './BasePart';
import type { PartDefinition } from '../hangar/PartDefinition';
import { Vector2 } from '../core/Vector2';

/**
 * Automatic part loader using Vite's import.meta.glob
 * Discovers and loads all part modules
 */
export class PartLoader {
    private static loadedParts: Map<string, BasePart> = new Map();

    /**
     * Load all parts from the parts directory
     * Uses Vite's import.meta.glob for auto-discovery
     */
    static async loadAllParts(): Promise<Map<string, BasePart>> {
        if (this.loadedParts.size > 0) {
            return this.loadedParts;
        }

        try {
            // Auto-discover all part modules
            // Vite will bundle these at build time
            const partModules = import.meta.glob<{ default: BasePart }>('./*/index.ts', {
                eager: false // Lazy load for better performance
            });

            console.log(`[PartLoader] Discovering parts...`, Object.keys(partModules));

            for (const [path, importFn] of Object.entries(partModules)) {
                try {
                    const module = await importFn();
                    const part: BasePart = module.default;

                    if (!part || !part.id || !part.config) {
                        console.warn(`[PartLoader] Invalid part module at ${path}`);
                        continue;
                    }

                    this.loadedParts.set(part.id, part);
                    console.log(`[PartLoader] Loaded part: ${part.id} (${part.config.name})`);
                } catch (error) {
                    console.error(`[PartLoader] Failed to load part from ${path}:`, error);
                }
            }

            console.log(`[PartLoader] Successfully loaded ${this.loadedParts.size} parts`);
        } catch (error) {
            console.error('[PartLoader] Error during part discovery:', error);
        }

        return this.loadedParts;
    }

    /**
     * Get a specific part by ID
     */
    static getPart(id: string): BasePart | undefined {
        return this.loadedParts.get(id);
    }

    /**
     * Get all loaded parts
     */
    static getAllParts(): BasePart[] {
        return Array.from(this.loadedParts.values());
    }

    /**
     * Convert a BasePart to PartDefinition (for backward compatibility)
     */
    static async convertToDefinition(part: BasePart): Promise<PartDefinition> {
        // Load texture (handle both sync and async)
        const textureResult = part.loadTexture();
        const textureUrl = textureResult instanceof Promise
            ? await textureResult
            : textureResult;

        return {
            id: part.config.id,
            name: part.config.name,
            type: part.config.type,
            description: part.config.description,
            texture: textureUrl,
            width: part.config.dimensions.width,
            height: part.config.dimensions.height,
            stats: {
                ...part.config.stats,
                // Explicitly map electricity stats if they exist in config
                electricity: part.config.stats.electricity,
                chargeRate: part.config.stats.chargeRate,
                sasConsumption: part.config.stats.sasConsumption
            },
            nodes: part.config.nodes.map(node => ({
                id: node.id,
                position: new Vector2(node.position.x, node.position.y),
                direction: new Vector2(node.direction.x, node.direction.y),
                type: node.type
            })),
            effect: part.config.visual?.effect
        };
    }
}
