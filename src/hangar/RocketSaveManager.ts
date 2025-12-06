import { RocketAssembly } from './RocketAssembly';
import { Vector2 } from '../core/Vector2';

export interface SavedRocket {
    name: string;
    savedAt: number; // timestamp
    partCount: number;
}

interface SerializedAssembly {
    parts: {
        instanceId: string;
        partId: string;
        position: { x: number; y: number };
        rotation: number;
        attachedTo?: string;
    }[];
    rootPartId: string | null;
}

export class RocketSaveManager {
    private static readonly STORAGE_KEY_PREFIX = 'rocket_save_';
    private static readonly METADATA_KEY = 'rocket_saves_metadata';

    /**
     * Save a rocket assembly to localStorage
     */
    static save(assembly: RocketAssembly, name: string): void {
        if (!name || name.trim() === '') {
            throw new Error('Rocket name cannot be empty');
        }

        if (assembly.parts.length === 0) {
            throw new Error('Cannot save an empty rocket');
        }

        const trimmedName = name.trim();

        // Serialize the assembly (convert Vector2 to plain objects)
        const serialized: SerializedAssembly = {
            parts: assembly.parts.map(part => ({
                instanceId: part.instanceId,
                partId: part.partId,
                position: { x: part.position.x, y: part.position.y },
                rotation: part.rotation,
                attachedTo: part.attachedTo
            })),
            rootPartId: assembly.rootPartId
        };

        // Save to localStorage
        const key = this.STORAGE_KEY_PREFIX + trimmedName;
        localStorage.setItem(key, JSON.stringify(serialized));

        // Update metadata
        this.updateMetadata(trimmedName, assembly.parts.length);
    }

    /**
     * Load a rocket assembly from localStorage
     */
    static load(name: string): RocketAssembly | null {
        const key = this.STORAGE_KEY_PREFIX + name;
        const data = localStorage.getItem(key);

        if (!data) {
            return null;
        }

        try {
            const serialized: SerializedAssembly = JSON.parse(data);
            const assembly = new RocketAssembly();

            // Deserialize parts (convert plain objects back to Vector2)
            assembly.parts = serialized.parts.map(part => ({
                instanceId: part.instanceId,
                partId: part.partId,
                position: new Vector2(part.position.x, part.position.y),
                rotation: part.rotation,
                attachedTo: part.attachedTo
            }));

            assembly.rootPartId = serialized.rootPartId;
            assembly.name = name; // Restore name

            return assembly;
        } catch (error) {
            console.error(`Failed to load rocket "${name}":`, error);
            return null;
        }
    }

    /**
     * Get a list of all saved rockets
     */
    static list(): SavedRocket[] {
        const metadataStr = localStorage.getItem(this.METADATA_KEY);
        if (!metadataStr) {
            return [];
        }

        try {
            const metadata: Record<string, SavedRocket> = JSON.parse(metadataStr);
            return Object.values(metadata).sort((a, b) => b.savedAt - a.savedAt);
        } catch (error) {
            console.error('Failed to parse metadata:', error);
            return [];
        }
    }

    /**
     * Delete a saved rocket
     */
    static delete(name: string): void {
        const key = this.STORAGE_KEY_PREFIX + name;
        localStorage.removeItem(key);

        // Update metadata
        const metadataStr = localStorage.getItem(this.METADATA_KEY);
        if (metadataStr) {
            try {
                const metadata: Record<string, SavedRocket> = JSON.parse(metadataStr);
                delete metadata[name];
                localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
            } catch (error) {
                console.error('Failed to update metadata:', error);
            }
        }
    }

    /**
     * Check if a rocket with the given name exists
     */
    static exists(name: string): boolean {
        const key = this.STORAGE_KEY_PREFIX + name;
        return localStorage.getItem(key) !== null;
    }

    /**
     * Get the most recently saved rocket
     */
    static getLatest(): RocketAssembly | null {
        const rockets = this.list();
        if (rockets.length === 0) {
            return null;
        }

        // List is already sorted by date (most recent first)
        const latest = rockets[0];
        return this.load(latest.name);
    }

    /**
     * Update the metadata index
     */
    private static updateMetadata(name: string, partCount: number): void {
        const metadataStr = localStorage.getItem(this.METADATA_KEY);
        const metadata: Record<string, SavedRocket> = metadataStr ? JSON.parse(metadataStr) : {};

        metadata[name] = {
            name,
            savedAt: Date.now(),
            partCount
        };

        localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    }
}
