import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';

// TypeScript needs help with the JSON import type
const config = configData as PartConfig;

/**
 * Crew Dragon Pod
 * SpaceX inspired capsule
 */
export class CrewDragonPod extends BasePart {
    id = config.id;
    config = config;

    /**
     * Load texture using Vite's asset handling
     */
    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }
}

import { DragonCockpit } from './DragonCockpit';

// Export the theme instance for auto-registration
export const cockpitTheme = new DragonCockpit();

// Export an instance as the default export
export default new CrewDragonPod();
