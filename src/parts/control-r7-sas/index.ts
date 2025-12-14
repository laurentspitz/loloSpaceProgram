import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

// TypeScript needs help with the JSON import type
const config = configData as PartConfig;

/**
 * R7 SAS Guidance Module
 * Soviet-era autonomous guidance system for the R7 Semyorka rocket
 * Provides attitude control and stability augmentation
 */
export class ControlR7Sas extends BasePart {
    id = config.id;
    config = config;

    locales = {
        en: en,
        fr: fr
    };

    /**
     * Load texture using Vite's asset handling
     * The texture.png file will be bundled and the URL resolved at build time
     */
    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }
}

// Export an instance as the default export
export default new ControlR7Sas();
