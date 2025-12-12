import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config = configData as PartConfig;

export class GenericFairing extends BasePart {
    id = config.id;
    config = config;

    locales = {
        en: en,
        fr: fr
    };

    loadTexture(): string {
        // For fairings we'll return the left texture as the default
        // The rendering code will handle the dual texture logic
        return new URL('./texture_left.png', import.meta.url).href;
    }

    // Additional method to get both textures for special rendering
    loadTextureLeft(): string {
        return new URL('./texture_left.png', import.meta.url).href;
    }

    loadTextureRight(): string {
        return new URL('./texture_right.png', import.meta.url).href;
    }
}

export default new GenericFairing();
