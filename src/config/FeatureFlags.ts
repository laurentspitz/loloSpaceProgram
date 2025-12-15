/**
 * Feature Flags - Control which features are enabled
 * 
 * Usage:
 * - For debugging: toggle flags to isolate issues
 * - For V1 build: disable experimental features
 * 
 * Set via environment variables or modify defaults here.
 */

export const FeatureFlags = {
    // ============================================
    // PHYSICS SYSTEMS
    // ============================================

    /** Use Physics V2 (100% Matter.js) instead of V1 (N-body + manual collision) */
    PHYSICS_V2: false,

    /** N-body orbital physics (gravity between all bodies) - V1 only */
    PHYSICS_ORBITAL: true,

    /** Atmospheric drag on rockets */
    PHYSICS_ATMOSPHERE: true,

    /** Surface collision detection and response - V1 only */
    PHYSICS_COLLISION: true,

    // ============================================
    // GAMEPLAY FEATURES
    // ============================================

    /** Staging system for multi-stage rockets */
    GAMEPLAY_STAGING: true,

    /** Fuel consumption system */
    GAMEPLAY_FUEL: true,

    /** Parachute deployment */
    GAMEPLAY_PARACHUTES: true,

    /** Debris spawning on stage separation */
    GAMEPLAY_DEBRIS: true,

    // ============================================
    // RENDERING
    // ============================================

    /** Engine thrust particle effects */
    RENDER_PARTICLES: true,

    /** Trajectory prediction line */
    RENDER_TRAJECTORY: true,

    /** Atmosphere glow effect */
    RENDER_ATMOSPHERE_GLOW: true,

    // ============================================
    // DEBUG
    // ============================================

    /** Console logging for physics debug */
    DEBUG_PHYSICS_LOG: false,

    /** Show collision bounds */
    DEBUG_COLLISION_BOUNDS: false,
};

// Type for accessing flags
export type FeatureFlagKey = keyof typeof FeatureFlags;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
    return FeatureFlags[flag];
}

/**
 * Toggle a feature (for debugging)
 */
export function toggleFeature(flag: FeatureFlagKey): boolean {
    (FeatureFlags as Record<FeatureFlagKey, boolean>)[flag] = !FeatureFlags[flag];
    console.log(`🚩 Feature ${flag} is now ${FeatureFlags[flag] ? 'ENABLED' : 'DISABLED'}`);
    return FeatureFlags[flag];
}
