import { ParticleEffect, type ParticleEffectConfig } from '../ParticleEffect';

/**
 * RCS thruster effect (small white puffs)
 * Used by RCS blocks for attitude control
 */
export class RCSEffect extends ParticleEffect {
    getConfig(): ParticleEffectConfig {
        return {
            type: 'rcs',
            colors: {
                initial: { r: 1.0, g: 1.0, b: 1.0 },  // Pure white
                mid: { r: 0.8, g: 0.8, b: 0.8 },      // Light gray
                final: { r: 0.5, g: 0.5, b: 0.5 }     // Medium gray
            },
            sizes: {
                initial: 40,    // Small particles
                max: 150        // Modest expansion
            },
            spread: 0.25,       // Wide spread (omnidirectional)
            nozzleRadius: 0.3   // Tiny nozzle
        };
    }
}
