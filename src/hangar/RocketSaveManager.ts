import { RocketAssembly } from './RocketAssembly';
import { Vector2 } from '../core/Vector2';
import { FirebaseService } from '../services/firebase';
import { NotificationManager } from '../ui/NotificationManager';

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
        flipped?: boolean;
    }[];
    rootPartId: string | null;
}

export class RocketSaveManager {
    private static readonly STORAGE_KEY_PREFIX = 'rocket_save_';
    private static readonly METADATA_KEY = 'rocket_saves_metadata';
    private static migrationDone = false;

    /**
     * Migrate rockets from localStorage to Firebase (one-time operation)
     */
    static async migrateFromLocalStorage(userId: string): Promise<number> {
        if (this.migrationDone || !userId) return 0;

        try {
            const metadataStr = localStorage.getItem(this.METADATA_KEY);
            if (!metadataStr) {
                this.migrationDone = true;
                return 0;
            }

            const metadata: Record<string, SavedRocket> = JSON.parse(metadataStr);
            const rockets = Object.values(metadata);
            let migratedCount = 0;

            for (const rocket of rockets) {
                const key = this.STORAGE_KEY_PREFIX + rocket.name;
                const data = localStorage.getItem(key);
                if (data) {
                    const serialized: SerializedAssembly = JSON.parse(data);
                    const id = `rocket_${rocket.savedAt}_${Math.random().toString(36).slice(2, 9)}`;

                    await FirebaseService.saveRocket(userId, id, {
                        name: rocket.name,
                        partCount: rocket.partCount,
                        createdAt: rocket.savedAt,
                        ...serialized
                    });
                    migratedCount++;
                }
            }

            if (migratedCount > 0) {
                // Clear localStorage after successful migration
                localStorage.removeItem(this.METADATA_KEY);
                rockets.forEach(r => {
                    localStorage.removeItem(this.STORAGE_KEY_PREFIX + r.name);
                });

                NotificationManager.show(`${migratedCount} rocket(s) migrated to cloud!`, 'success');
                console.log(`Migrated ${migratedCount} rockets to Firebase`);
            }

            this.migrationDone = true;
            return migratedCount;
        } catch (error) {
            console.error("Migration failed:", error);
            this.migrationDone = true;
            return 0;
        }
    }

    /**
     * Remove undefined values from an object (Firestore doesn't accept undefined)
     */
    private static removeUndefined(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefined(item));
        } else if (obj !== null && typeof obj === 'object') {
            const cleaned: any = {};
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    cleaned[key] = this.removeUndefined(obj[key]);
                }
            }
            return cleaned;
        }
        return obj;
    }

    /**
     * Save a rocket assembly to Firebase
     */
    static async save(assembly: RocketAssembly, name: string, userId?: string): Promise<void> {
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
                attachedTo: part.attachedTo,
                flipped: part.flipped
            })),
            rootPartId: assembly.rootPartId
        };

        if (userId) {
            // Save to Firebase - remove undefined values first
            const id = `rocket_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const dataToSave = this.removeUndefined({
                name: trimmedName,
                partCount: assembly.parts.length,
                createdAt: Date.now(),
                ...serialized
            });

            await FirebaseService.saveRocket(userId, id, dataToSave);
            console.log(`✓ Rocket "${trimmedName}" saved to cloud`);
        } else {
            // Fallback to localStorage if not logged in
            const key = this.STORAGE_KEY_PREFIX + trimmedName;
            localStorage.setItem(key, JSON.stringify(serialized));
            this.updateMetadata(trimmedName, assembly.parts.length);
            console.log(`✓ Rocket "${trimmedName}" saved to localStorage`);
        }
    }

    /**
     * Load a rocket assembly from Firebase or localStorage
     */
    static async load(nameOrId: string, userId?: string): Promise<RocketAssembly | null> {
        if (userId) {
            // Try loading from Firebase
            try {
                const rockets = await FirebaseService.loadRockets(userId);
                const rocket = rockets.find((r: any) => r.id === nameOrId || r.name === nameOrId);

                if (rocket && rocket.parts) {
                    const assembly = new RocketAssembly();
                    assembly.parts = rocket.parts.map((part: any) => ({
                        instanceId: part.instanceId,
                        partId: part.partId,
                        position: new Vector2(part.position.x, part.position.y),
                        rotation: part.rotation,
                        attachedTo: part.attachedTo,
                        flipped: part.flipped
                    }));
                    assembly.rootPartId = rocket.rootPartId;
                    assembly.name = rocket.name;
                    return assembly;
                }
            } catch (e) {
                console.warn('Failed to load from Firebase, trying localStorage:', e);
            }
        }

        // Fallback to localStorage
        const key = this.STORAGE_KEY_PREFIX + nameOrId;
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
                attachedTo: part.attachedTo,
                flipped: part.flipped
            }));

            assembly.rootPartId = serialized.rootPartId;
            assembly.name = nameOrId; // Restore name

            return assembly;
        } catch (error) {
            console.error(`Failed to load rocket "${nameOrId}":`, error);
            return null;
        }
    }

    /**
     * Get a list of all saved rockets
     */
    static async list(userId?: string): Promise<SavedRocket[]> {
        if (userId) {
            // Load from Firebase
            try {
                const rockets = await FirebaseService.loadRockets(userId);
                return rockets.map((r: any) => ({
                    name: r.name || 'Unnamed Rocket',
                    savedAt: r.createdAt || r.updatedAt?.seconds * 1000 || Date.now(),
                    partCount: r.partCount || 0
                })).sort((a, b) => b.savedAt - a.savedAt);
            } catch (e) {
                console.warn('Failed to load from Firebase, using localStorage:', e);
            }
        }

        // Fallback to localStorage
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
    static async delete(nameOrId: string, userId?: string): Promise<void> {
        if (userId) {
            // Try deleting from Firebase
            try {
                await FirebaseService.deleteRocket(userId, nameOrId);
                return;
            } catch (e) {
                console.warn('Failed to delete from Firebase, trying localStorage:', e);
            }
        }

        // Fallback to localStorage
        const key = this.STORAGE_KEY_PREFIX + nameOrId;
        localStorage.removeItem(key);

        // Update metadata
        const metadataStr = localStorage.getItem(this.METADATA_KEY);
        if (metadataStr) {
            try {
                const metadata: Record<string, SavedRocket> = JSON.parse(metadataStr);
                delete metadata[nameOrId];
                localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
            } catch (error) {
                console.error('Failed to update metadata:', error);
            }
        }
    }

    /**
     * Check if a rocket with the given name exists
     */
    static async exists(nameOrId: string, userId?: string): Promise<boolean> {
        if (userId) {
            const rockets = await this.list(userId);
            return rockets.some(r => r.name === nameOrId);
        }

        const key = this.STORAGE_KEY_PREFIX + nameOrId;
        return localStorage.getItem(key) !== null;
    }

    /**
     * Get the most recently saved rocket
     */
    static async getLatest(userId?: string): Promise<RocketAssembly | null> {
        const rockets = await this.list(userId);
        if (rockets.length === 0) {
            return null;
        }

        // List is already sorted by date (most recent first)
        const latest = rockets[0];
        return this.load(latest.name, userId);
    }

    /**
     * Update the metadata index (localStorage only)
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
