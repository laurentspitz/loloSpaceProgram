import { BasePart } from '../BasePart';
import type { PartConfig, ParticleEffectConfig } from '../PartConfig';
import configData from './config.json';
import { StandardFlameEffect } from '../behaviors/StandardFlameEffect';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config = configData as PartConfig;

export class BoosterBlockB extends BasePart {
    id = config.id;
    config = config;

    locales = {
        en: en,
        fr: fr
    };

    private effect = new StandardFlameEffect();

    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }

    getParticleEffect(): ParticleEffectConfig {
        return this.effect.getConfig();
    }
}

export default new BoosterBlockB();
