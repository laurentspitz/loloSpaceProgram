/**
 * Particle Effect interface for part behaviors
 * Allows parts to specify custom particle effects
 */

export interface ParticleEffectConfig {
    /** Effect type identifier */
    type: 'standard' | 'blue_flame' | 'rcs' | 'custom';

    /** Color configuration */
    colors?: {
        /** Initial color (bright core) */
        initial: { r: number; g: number; b: number };
        /** Mid-transition color */
        mid?: { r: number; g: number; b: number };
        /** Final color (smoke/exhaust) */
        final?: { r: number; g: number; b: number };
    };

    /** Size configuration */
    sizes?: {
        /** Initial particle size in pixels */
        initial: number;
        /** Maximum particle size during expansion */
        max: number;
    };

    /** Velocity spread (randomness) */
    spread?: number;

    /** Nozzle radius for emission area */
    nozzleRadius?: number;
}

/**
 * Abstract base class for particle effects
 */
export abstract class ParticleEffect {
    abstract getConfig(): ParticleEffectConfig;
}
