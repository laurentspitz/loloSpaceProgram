import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config = configData as PartConfig;

export class TankBlockE extends BasePart {
    id = config.id;
    config = config;

    locales = {
        en: en,
        fr: fr
    };

    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }
}

export default new TankBlockE();
