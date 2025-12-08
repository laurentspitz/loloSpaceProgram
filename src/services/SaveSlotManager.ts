/**
 * SaveSlotManager - Manages multiple game save slots with Firebase persistence
 */

import { FirebaseService } from './firebase';

export interface SaveSlot {
    id: string;
    name: string;
    timestamp: number;
    missionTime: number;
    rocketName: string;
    location: string; // e.g., "Orbiting Earth"
    data: any; // Full game state
}

export class SaveSlotManager {
    /**
     * List all save slots for the current user
     */
    static async listSlots(userId?: string): Promise<SaveSlot[]> {
        if (!userId) {
            // Fallback to localStorage
            return this.listLocalSlots();
        }

        try {
            const saves = await FirebaseService.listSaves(userId);
            return saves.map((save: any) => ({
                id: save.id,
                name: save.name || 'Unnamed Save',
                timestamp: save.timestamp || Date.now(),
                missionTime: save.elapsedGameTime || 0,
                rocketName: save.rocket?.name || 'Unknown',
                location: this.getLocationDescription(save),
                data: save
            }));
        } catch (error) {
            console.error('Failed to list slots from Firebase:', error);
            return this.listLocalSlots();
        }
    }

    /**
     * Save game state to a specific slot
     */
    static async saveToSlot(slotName: string, gameState: any, userId?: string): Promise<void> {
        if (!userId) {
            // Fallback to localStorage
            this.saveLocalSlot(slotName, gameState);
            return;
        }

        try {
            // Enrich game state with save metadata
            const enrichedState = {
                ...gameState,
                name: slotName,
                timestamp: Date.now(),
                rocketName: gameState.rocket?.name || gameState.rocket?.parts?.[0]?.definition?.name || 'Unknown Rocket'
            };

            // Clean undefined values before sending to Firebase
            const cleanedState = this.removeUndefined(enrichedState);
            await FirebaseService.saveGame(userId, slotName, cleanedState);
            console.log(`✓ Game saved to slot "${slotName}"`);
        } catch (error) {
            console.error('Failed to save to Firebase:', error);
            // Fallback to local
            this.saveLocalSlot(slotName, gameState);
            throw error;
        }
    }

    /**
     * Load game state from a specific slot
     */
    static async loadFromSlot(slotId: string, userId?: string): Promise<any> {
        if (!userId) {
            // Fallback to localStorage
            return this.loadLocalSlot(slotId);
        }

        try {
            const gameState = await FirebaseService.loadGame(userId, slotId);
            if (!gameState) {
                throw new Error(`Slot "${slotId}" not found`);
            }
            return gameState;
        } catch (error) {
            console.error('Failed to load from Firebase:', error);
            // Fallback to local
            return this.loadLocalSlot(slotId);
        }
    }

    /**
     * Delete a save slot
     */
    static async deleteSlot(slotId: string, userId?: string): Promise<void> {
        if (!userId) {
            // Fallback to localStorage
            this.deleteLocalSlot(slotId);
            return;
        }

        try {
            await FirebaseService.deleteGame(userId, slotId);
            console.log(`✓ Slot "${slotId}" deleted`);
        } catch (error) {
            console.error('Failed to delete from Firebase:', error);
            throw error;
        }
    }

    // --- LocalStorage Fallback Methods ---

    private static listLocalSlots(): SaveSlot[] {
        try {
            const slotsData = localStorage.getItem('lolosp_save_slots');
            if (!slotsData) return [];

            const slots = JSON.parse(slotsData);
            return Object.entries(slots).map(([id, data]: [string, any]) => ({
                id,
                name: data.name || 'Unnamed Save',
                timestamp: data.timestamp || Date.now(),
                missionTime: data.elapsedGameTime || 0,
                rocketName: data.rocket?.name || 'Unknown',
                location: this.getLocationDescription(data),
                data
            }));
        } catch (error) {
            console.error('Failed to list local slots:', error);
            return [];
        }
    }

    private static saveLocalSlot(slotName: string, gameState: any): void {
        try {
            const slotsData = localStorage.getItem('lolosp_save_slots');
            const slots = slotsData ? JSON.parse(slotsData) : {};

            slots[slotName] = {
                ...gameState,
                name: slotName,
                timestamp: Date.now()
            };

            localStorage.setItem('lolosp_save_slots', JSON.stringify(slots));
            console.log(`✓ Game saved locally to slot "${slotName}"`);
        } catch (error) {
            console.error('Failed to save local slot:', error);
            throw error;
        }
    }

    private static loadLocalSlot(slotId: string): any {
        try {
            const slotsData = localStorage.getItem('lolosp_save_slots');
            if (!slotsData) {
                throw new Error('No local saves found');
            }

            const slots = JSON.parse(slotsData);
            if (!slots[slotId]) {
                throw new Error(`Slot "${slotId}" not found`);
            }

            return slots[slotId];
        } catch (error) {
            console.error('Failed to load local slot:', error);
            throw error;
        }
    }

    private static deleteLocalSlot(slotId: string): void {
        try {
            const slotsData = localStorage.getItem('lolosp_save_slots');
            if (!slotsData) return;

            const slots = JSON.parse(slotsData);
            delete slots[slotId];

            localStorage.setItem('lolosp_save_slots', JSON.stringify(slots));
            console.log(`✓ Local slot "${slotId}" deleted`);
        } catch (error) {
            console.error('Failed to delete local slot:', error);
            throw error;
        }
    }

    // --- Helper Methods ---

    /**
     * Recursively remove undefined values from an object
     * Firestore doesn't accept undefined values
     */
    private static removeUndefined(obj: any): any {
        if (obj === null || obj === undefined) {
            return null;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefined(item));
        }

        if (typeof obj === 'object') {
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

    private static getLocationDescription(gameState: any): string {
        if (!gameState.rocket) return 'Unknown';

        // Extract location from game state
        // This is a simplified version - adjust based on actual game state structure
        const closestBody = gameState.simulation?.closestBody || 'Space';
        const altitude = gameState.rocket?.altitude;

        if (altitude && altitude < 100000) {
            return `On ${closestBody}`;
        } else {
            return `Orbiting ${closestBody}`;
        }
    }
}
