import type { Rocket } from '../entities/Rocket';
import type { Body } from '../core/Body';
import type { Mission, MissionConfig } from './types';
import { MissionLoader } from './MissionLoader';

/**
 * MissionManager - Handles mission state, unlocking, and completion checking
 * Uses MissionLoader for auto-discovery of mission files
 */
export class MissionManager {
    missions: Mission[] = [];
    activeMission: Mission | null = null;
    completedMissionIds: Set<string> = new Set();
    private initialized = false;

    constructor() {
        // Start loading missions asynchronously
        this.initializeMissions();
    }

    /**
     * Initialize missions using auto-discovery
     */
    private async initializeMissions(): Promise<void> {
        if (this.initialized) return;

        try {
            const configs = await MissionLoader.loadAllMissions();
            this.missions = configs.map((config: MissionConfig) => ({
                ...config,
                completed: false
            }));
            this.initialized = true;
            console.log(`[MissionManager] Initialized with ${this.missions.length} missions`);
        } catch (error) {
            console.error('[MissionManager] Failed to initialize missions:', error);
        }
    }

    /**
     * Ensure missions are loaded before use
     */
    async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initializeMissions();
        }
    }

    /**
     * Update mission states based on current rocket position/velocity
     * @param rocket - The player's rocket
     * @param currentYear - Current game year (important for year validation!)
     * @param bodies - All celestial bodies
     */
    update(rocket: Rocket, currentYear: number, bodies: Body[]): void {
        this.missions.forEach(mission => {
            // Skip already completed
            if (this.completedMissionIds.has(mission.id)) {
                mission.completed = true;
                return;
            }

            // YEAR VALIDATION: Mission must be unlocked (year <= currentYear)
            if (mission.year > currentYear) {
                return; // Mission not yet available
            }

            // Check completion based on mission type
            if (mission.type === 'event') {
                // Events auto-complete when year is reached
                this.completeMission(mission);
            } else if (mission.type === 'objective' && mission.checkCondition) {
                // Objectives require condition to be met
                if (mission.checkCondition(rocket, bodies)) {
                    this.completeMission(mission);
                }
            }
        });
    }

    private completeMission(mission: Mission): void {
        if (mission.completed) return;

        console.log(`MISSION COMPLETED: ${mission.title}! ${mission.rewardMoney ? '+' + mission.rewardMoney + '$' : ''}`);
        mission.completed = true;
        this.completedMissionIds.add(mission.id);

        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('mission-completed', { detail: { mission } }));
    }

    /**
     * Get missions available at a given year
     */
    getMissionsForYear(year: number): Mission[] {
        return this.missions.filter(m => m.year === year);
    }

    /**
     * Get all missions up to current year
     */
    getAvailableMissions(year: number): Mission[] {
        return this.missions.filter(m => m.year <= year);
    }

    /**
     * Get next uncompleted objective mission
     */
    getNextAvailableMission(year: number): Mission | null {
        return this.missions.find(m =>
            m.type === 'objective' &&
            !this.completedMissionIds.has(m.id) &&
            m.year <= year
        ) || null;
    }

    serialize(): { completedIds: string[] } {
        return {
            completedIds: Array.from(this.completedMissionIds)
        };
    }

    deserialize(data: { completedIds?: string[] } | null): void {
        if (!data) return;
        if (data.completedIds && Array.isArray(data.completedIds)) {
            data.completedIds.forEach((id: string) => {
                this.completedMissionIds.add(id);
                const m = this.missions.find(mission => mission.id === id);
                if (m) m.completed = true;
            });
        }
    }
}
