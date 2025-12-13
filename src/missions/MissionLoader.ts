import i18next from 'i18next';
import type { MissionConfig, Mission } from './types';

interface MissionModule {
    default: MissionConfig;
    locales?: { [lang: string]: object };
}

/**
 * Automatic mission loader using Vite's import.meta.glob
 * Discovers and loads all mission modules from definitions/
 * Supports both:
 *   - Flat files: definitions/YEAR_MM_name.ts
 *   - Modular folders: definitions/name/index.ts (with locales)
 */
export class MissionLoader {
    private static loadedMissions: MissionConfig[] = [];
    private static loaded = false;

    /**
     * Load all missions from the definitions directory
     * Uses Vite's import.meta.glob for auto-discovery
     */
    static async loadAllMissions(): Promise<MissionConfig[]> {
        if (this.loaded) {
            return this.loadedMissions;
        }

        try {
            // Load modular missions (folders with index.ts)
            await this.loadModularMissions();

            // Load flat file missions (YEAR_MM_name.ts)
            await this.loadFlatMissions();

            // Sort by year, then month
            this.loadedMissions.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return (a.month || 0) - (b.month || 0);
            });
            this.loaded = true;

        } catch (error) {
            console.error('[MissionLoader] Error during mission discovery:', error);
        }

        return this.loadedMissions;
    }

    /**
     * Load missions from modular folders (with locales)
     */
    private static async loadModularMissions(): Promise<void> {
        const missionModules = import.meta.glob<MissionModule>('./definitions/*/index.ts', {
            eager: false
        });

        for (const [path, importFn] of Object.entries(missionModules)) {
            try {
                const module = await importFn();
                const config = module.default;
                const locales = module.locales;

                if (!config || !config.id || !config.type) continue;

                // Check for duplicates
                if (this.loadedMissions.some(m => m.id === config.id)) {
                    console.warn(`[MissionLoader] Duplicate mission ID: ${config.id}, skipping`);
                    continue;
                }

                // Validate objectives have checkCondition
                if (config.type === 'objective' && typeof config.checkCondition !== 'function') {
                    console.warn(`[MissionLoader] Objective mission ${config.id} missing checkCondition`);
                    continue;
                }

                // Register locales if present
                if (locales) {
                    this.registerLocales(config.id, locales);
                }

                this.loadedMissions.push(config);

            } catch (error) {
                console.error(`[MissionLoader] Failed to load modular mission from ${path}:`, error);
            }
        }
    }

    /**
     * Load missions from flat files (legacy format)
     */
    private static async loadFlatMissions(): Promise<void> {
        const missionModules = import.meta.glob<{ [key: string]: MissionConfig }>('./definitions/*.ts', {
            eager: false,
            import: '*'
        });

        for (const [path, importFn] of Object.entries(missionModules)) {
            try {
                const module = await importFn();

                for (const [exportName, value] of Object.entries(module)) {
                    if (exportName === 'default') continue;

                    const mission = value as MissionConfig;
                    if (mission && mission.id && mission.type) {
                        // Check for duplicates
                        if (this.loadedMissions.some(m => m.id === mission.id)) {
                            continue; // Skip silently (modular version takes priority)
                        }
                        // Validate objectives have checkCondition
                        if (mission.type === 'objective' && typeof mission.checkCondition !== 'function') {
                            console.warn(`[MissionLoader] Objective mission ${mission.id} missing checkCondition`);
                            continue;
                        }
                        this.loadedMissions.push(mission);
                    }
                }
            } catch (error) {
                console.error(`[MissionLoader] Failed to load flat mission from ${path}:`, error);
            }
        }
    }

    /**
     * Register mission locales with i18next
     */
    private static registerLocales(missionId: string, locales: { [lang: string]: object }): void {
        for (const [lang, translations] of Object.entries(locales)) {
            if (i18next.hasResourceBundle(lang, 'translation')) {
                i18next.addResourceBundle(lang, 'translation', translations, true, true);
            } else {
                i18next.addResourceBundle(lang, 'translation', translations);
            }
        }
    }

    /**
     * Get all loaded missions as runtime Mission objects
     */
    static getMissions(): Mission[] {
        return this.loadedMissions.map(config => ({
            ...config,
            completed: false
        }));
    }

    /**
     * Get missions for a specific year
     */
    static getMissionsForYear(year: number): MissionConfig[] {
        return this.loadedMissions.filter(m => m.year === year);
    }
}
