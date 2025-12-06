import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';

const config = configData as PartConfig;

export class EngineTitan extends BasePart {
    id = config.id;
    config = config;

    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }
}

export default new EngineTitan();
