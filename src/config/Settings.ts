export const Settings = {
    PHYSICS: {
        G: 6.67430e-11, // Gravitational Constant
        MAX_STEP: 1,    // Max physics step size (seconds)
    },
    GAMEPLAY: {
        COLLISION: {
            SOFT_LANDING_THRESHOLD: 50, // m/s
            CRASH_THRESHOLD: 200,       // m/s
            PENETRATION_CORRECTION_SPEED: 3.0,
        },
        ROCKET: {
            INITIAL_ZOOM: 1e-6, // Scale (meters per pixel)
        }
    }
};

export interface RocketConfig {
    name?: string;
    color?: string;
    mass?: number;
    // Add other known properties from assembly/rocket config here
    // Part definitions
    parts?: any[];
    getRocketConfig?(): RocketConfig; // Helper in assembly object
}
