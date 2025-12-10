import type { PartConfig, PartContext, ParticleEffectConfig } from './PartConfig';

/**
 * Abstract base class for all parts
 * Each part module extends this class
 */
export abstract class BasePart {
    /**
     * Unique identifier for this part
     */
    abstract id: string;

    /**
     * Configuration loaded from config.json
     */
    abstract config: PartConfig;

    /**
     * Optional: Modular translations for this part
     * Structure: { en: { ... }, fr: { ... } }
     */
    locales?: Record<string, any>;

    /**
     * Load the texture for this part
     * Returns a URL or data URL
     */
    abstract loadTexture(): Promise<string> | string;

    /**
     * Optional: Called every frame when the part is active
     */
    onUpdate?(deltaTime: number, context: PartContext): void;

    /**
     * Optional: Called when the part is activated (e.g., engine turned on)
     */
    onActivate?(context: PartContext): void;

    /**
     * Optional: Called when the part is deactivated
     */
    onDeactivate?(context: PartContext): void;

    /**
     * Optional: Get particle effect configuration for engines/RCS
     */
    getParticleEffect?(): ParticleEffectConfig | null;
}
