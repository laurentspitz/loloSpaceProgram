import type { PartDefinition } from './PartDefinition';
import { PartLoader } from '../parts/PartLoader';
import type { BasePart } from '../parts/BasePart';

export class PartRegistry {
    private static parts: Map<string, PartDefinition> = new Map();
    private static moduleParts: Map<string, BasePart> | null = null;
    private static initialized = false;

    static async register(part: PartDefinition) {
        this.parts.set(part.id, part);
    }

    static get(id: string): PartDefinition | undefined {
        return this.parts.get(id);
    }

    static getAll(): PartDefinition[] {
        return Array.from(this.parts.values());
    }

    /**
     * Initialize the part registry
     * Now uses the new modular part system via PartLoader
     */
    static async init() {
        if (this.initialized) {
            console.warn('[PartRegistry] Already initialized');
            return;
        }

        try {
            // Load all parts from the modular system
            this.moduleParts = await PartLoader.loadAllParts();

            // Convert modular parts to PartDefinition format for backward compatibility
            for (const [id, part] of this.moduleParts.entries()) {
                try {
                    // Await the conversion since it's now async
                    const definition = await PartLoader.convertToDefinition(part);
                    this.parts.set(id, definition);
                } catch (error) {
                    console.error(`[PartRegistry] Failed to register part ${id}:`, error);
                }
            }

            this.initialized = true;
        } catch (error) {
            console.error('[PartRegistry] Error during initialization:', error);
            throw new Error('Failed to initialize part registry. Please check that all part modules are valid.');
        }
    }
}
