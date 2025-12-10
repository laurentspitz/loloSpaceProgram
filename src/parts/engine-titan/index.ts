import { BasePart } from '../BasePart';
import type { PartConfig, ParticleEffectConfig } from '../PartConfig';
import configData from './config.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import { BlueFlameEffect } from '../behaviors/BlueFlameEffect';

const config = configData as PartConfig;

export class EngineTitan extends BasePart {
    id = config.id;
    config = config;

    locales = {
        en: en,
        fr: fr
    };

    private effect = new BlueFlameEffect();

    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }

    getParticleEffect(): ParticleEffectConfig {
        return this.effect.getConfig();
    }
}

export default new EngineTitan();
