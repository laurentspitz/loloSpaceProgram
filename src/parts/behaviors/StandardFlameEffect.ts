import { ParticleEffect, type ParticleEffectConfig } from '../ParticleEffect';

/**
 * Standard engine flame effect (orange/yellow flame)
 * Used by LV-T30 and similar engines
 */
export class StandardFlameEffect extends ParticleEffect {
    getConfig(): ParticleEffectConfig {
        return {
            type: 'standard',
            colors: {
                initial: { r: 1.0, g: 0.9, b: 0.7 },  // Bright white-yellow
                mid: { r: 0.9, g: 0.4, b: 0.1 },      // Orange-red
                final: { r: 0.7, g: 0.7, b: 0.7 }     // Light gray smoke
            },
            sizes: {
                initial: 200,   // Large flame particles
                max: 800        // Expand to large smoke cloud
            },
            spread: 0.15,       // Moderate spread
            nozzleRadius: 2.5   // Standard nozzle
        };
    }
}
