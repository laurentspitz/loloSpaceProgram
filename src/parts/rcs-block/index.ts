import { BasePart } from '../BasePart';
import type { PartConfig, ParticleEffectConfig } from '../PartConfig';
import configData from './config.json';
import { RCSEffect } from '../behaviors/RCSEffect';

const config = configData as PartConfig;

export class RCSBlock extends BasePart {
    id = config.id;
    config = config;
    private effect = new RCSEffect();

    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }

    getParticleEffect(): ParticleEffectConfig {
        return this.effect.getConfig();
    }
}

export default new RCSBlock();
