import type { Rocket } from '../entities/Rocket';
import type { Body } from '../core/Body';
import type { Mission, MissionConfig } from './types';
import { MissionLoader } from './MissionLoader';
import { getLaunchPad } from '../config/LaunchPads';

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
                if (mission.checkCondition) {
                    // Start checking condition once year is reached
                    if (currentYear >= mission.year) {
                        if (mission.checkCondition(rocket, bodies, currentYear)) {
                            this.completeMission(mission);
                        }
                    }
                } else {
                    // Legacy behavior: Auto-complete when year is fully reached + margin of safety or just start of year?
                    // Original behavior was implicitly "when update is called and year >= currentYear"
                    // But update() has explicit check `if (mission.year > currentYear) return` at top.
                    // So if we are here, year <= currentYear.

                    // Implicitly, events without conditions complete immediately when available
                    this.completeMission(mission);
                }
            } else if (mission.type === 'objective' && mission.checkCondition) {
                // Objectives require condition to be met
                if (mission.checkCondition(rocket, bodies, currentYear)) {
                    this.completeMission(mission);
                }
            }
        });
    }

    /**
     * Check and complete event-type missions for the given year
     * Safe to call without a rocket instance (unlike update())
     */
    checkEvents(currentYear: number): void {
        this.missions.forEach(mission => {
            if (this.completedMissionIds.has(mission.id)) return;
            if (mission.year > currentYear) return;

            if (mission.type === 'event') {
                // If it has a condition, we can't check it without a Rocket (usually)
                // But if it has NO condition (pure date event), we can complete it.
                if (!mission.checkCondition) {
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
    /**
     * Get the launch configuration based on the first available mission with a launch pad
     * Returns default coords (lat 0, long 0) if no launch pad is specified
     */
    getLaunchConfig(year: number): { latitude: number; longitude: number } {
        // Find first mission with a launchPad that matches the current year context
        const missionsWithLaunchPad = this.missions.filter(m =>
            m.year <= year && m.launchPad
        );

        // Sort by year descending to get the most recent mission
        missionsWithLaunchPad.sort((a, b) => b.year - a.year);

        if (missionsWithLaunchPad.length > 0) {
            const launchPadId = missionsWithLaunchPad[0].launchPad!;
            const launchPad = getLaunchPad(launchPadId);
            if (launchPad) {
                console.log(`[MissionManager] Using launch pad: ${launchPad.name} (lat: ${launchPad.latitude}°, long: ${launchPad.longitude}°)`);
                return {
                    latitude: launchPad.latitude,
                    longitude: launchPad.longitude
                };
            }
        }

        // Default: equator, prime meridian
        return { latitude: 0, longitude: 0 };
    }
}

