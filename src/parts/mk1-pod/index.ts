import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';

// TypeScript needs help with the JSON import type
const config = configData as PartConfig;

/**
 * Mk1 Command Pod
 * The classic single-Kerbal capsule
 */
export class Mk1Pod extends BasePart {
    id = config.id;
    config = config;

    /**
     * Load texture using Vite's asset handling
     * The texture.png file will be bundled and the URL resolved at build time
     */
    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }
}

// Export an instance as the default export
export default new Mk1Pod();
