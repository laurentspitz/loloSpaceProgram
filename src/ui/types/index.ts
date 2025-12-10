import type { UI } from '../UI';

/**
 * Interface for modular cockpit themes
 * Parts can implement this to provide custom UI overlays
 */
export interface CockpitTheme {
    /** Unique ID for the theme (e.g., 'dragon') */
    id: string;

    /** Human readable name */
    name: string;

    /**
     * Called when the theme is activated.
     * Should create/show the overlay and handle any specific logic.
     */
    setup(ui: UI): void;

    /**
     * Called when the theme is deactivated.
     * Should hide/remove the overlay and clean up interactions.
     */
    cleanup(ui: UI): void;

    /**
     * Optional update loop for the theme (e.g., updating HUD values)
     */
    update?(deltaTime: number): void;
}

/**
 * Autopilot mode type
 */
export type AutopilotMode = 'off' | 'prograde' | 'retrograde' | 'target' | 'anti-target' | 'maneuver';
