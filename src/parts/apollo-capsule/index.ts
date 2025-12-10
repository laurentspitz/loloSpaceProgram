import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';
import { ApolloCockpit } from './ApolloCockpit';
import en from './locales/en.json';
import fr from './locales/fr.json';


// TypeScript needs help with the JSON import type
const config = configData as PartConfig;

/**
 * Apollo Capsule
 */
export class ApolloCapsule extends BasePart {
    id = config.id;
    config = config;

    locales = {
        en: en,
        fr: fr
    };

    /**
     * Load texture
     */
    loadTexture(): string {
        // Reuse Dragon texture as placeholder for now, or existing one
        return new URL('../crew-dragon-pod/texture.png', import.meta.url).href;
    }
}

// Export the theme instance for auto-registration
export const cockpitTheme = new ApolloCockpit();

export default new ApolloCapsule();
