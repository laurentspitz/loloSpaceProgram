/**
 * Controls configuration system
 * Allows customization of keyboard controls with persistent storage
 */

export interface ControlConfig {
    // Rocket controls
    thrust: string;
    cutEngines: string;
    rotateLeft: string;
    rotateRight: string;
    increaseThrottle: string;
    decreaseThrottle: string;

    // Time warp
    timeWarpIncrease: string;
    timeWarpDecrease: string;
    timeWarpReset: string;

    // Maneuver nodes
    createManeuverNode: string;
    deleteManeuverNode: string;

    // View controls
    toggleTrajectory: string;
    zoomIn: string;
    zoomOut: string;

    // Autopilot
    togglePrograde: string;
    toggleRetrograde: string;
    toggleTarget: string;
    toggleAntiTarget: string;
    toggleManeuver: string;
}

export const DEFAULT_CONTROLS: ControlConfig = {
    // Rocket controls (matching actual game controls: Z/S/Q/D + Shift/Ctrl)
    thrust: 'z',
    cutEngines: 's',
    rotateLeft: 'q',
    rotateRight: 'd',
    increaseThrottle: 'Shift',
    decreaseThrottle: 'Control',

    // Time warp
    timeWarpIncrease: '.',
    timeWarpDecrease: ',',
    timeWarpReset: '/',

    // Maneuver nodes
    createManeuverNode: 'n',
    deleteManeuverNode: 'Delete',

    // View controls
    toggleTrajectory: 't',
    zoomIn: '=',
    zoomOut: '-',

    // Autopilot
    togglePrograde: 'p',
    toggleRetrograde: 'r',
    toggleTarget: 'y',
    toggleAntiTarget: 'u',
    toggleManeuver: 'm',
};

/**
 * Manages keyboard controls with localStorage persistence
 */
export class ControlsManager {
    private controls: ControlConfig;

    constructor() {
        this.controls = { ...DEFAULT_CONTROLS };
        this.loadFromLocalStorage();
    }

    /**
     * Get the key binding for a specific action
     */
    getControl(action: keyof ControlConfig): string {
        return this.controls[action];
    }

    /**
     * Set a new key binding for an action
     */
    setControl(action: keyof ControlConfig, key: string): void {
        this.controls[action] = key;
        this.saveToLocalStorage();
    }

    /**
     * Reset all controls to defaults
     */
    reset(): void {
        this.controls = { ...DEFAULT_CONTROLS };
        this.saveToLocalStorage();
    }

    /**
     * Get all current controls
     */
    getAllControls(): ControlConfig {
        return { ...this.controls };
    }

    /**
     * Save controls to localStorage
     */
    private saveToLocalStorage(): void {
        try {
            localStorage.setItem('lolosp_controls', JSON.stringify(this.controls));
        } catch (e) {
            console.warn('Failed to save controls:', e);
        }
    }

    /**
     * Load controls from localStorage
     */
    private loadFromLocalStorage(): void {
        try {
            const saved = localStorage.getItem('lolosp_controls');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new controls added in updates
                this.controls = { ...DEFAULT_CONTROLS, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load controls, using defaults:', e);
            this.controls = { ...DEFAULT_CONTROLS };
        }
    }
}

// Export a singleton instance
export const controls = new ControlsManager();
