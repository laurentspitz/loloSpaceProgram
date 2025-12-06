import { BasePart } from '../BasePart';
import type { PartConfig, ParticleEffectConfig } from '../PartConfig';
import configData from './config.json';
import { StandardFlameEffect } from '../behaviors/StandardFlameEffect';

const config = configData as PartConfig;

export class EngineLVT30 extends BasePart {
    id = config.id;
    config = config;
    private effect = new StandardFlameEffect();

    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }

    getParticleEffect(): ParticleEffectConfig {
        return this.effect.getConfig();
    }
}

export default new EngineLVT30();
