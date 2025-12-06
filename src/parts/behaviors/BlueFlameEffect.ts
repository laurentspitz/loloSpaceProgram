import { ParticleEffect, type ParticleEffectConfig } from '../ParticleEffect';

/**
 * Blue flame effect for high-performance engines
 * Used by Titan engine and similar
 */
export class BlueFlameEffect extends ParticleEffect {
    getConfig(): ParticleEffectConfig {
        return {
            type: 'blue_flame',
            colors: {
                initial: { r: 0.6, g: 0.85, b: 1.0 }, // Bright cyan-white
                mid: { r: 0.2, g: 0.5, b: 0.9 },      // Deep blue
                final: { r: 0.3, g: 0.4, b: 0.8 }     // Blue-gray smoke
            },
            sizes: {
                initial: 250,   // Larger flame
                max: 900        // Big smoke expansion
            },
            spread: 0.1,        // Tighter spread (more focused)
            nozzleRadius: 3.5   // Larger nozzle
        };
    }
}
