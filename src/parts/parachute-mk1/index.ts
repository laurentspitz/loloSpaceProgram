import { BasePart } from '../BasePart';
import type { PartConfig, PartContext } from '../PartConfig';
import configData from './config.json';

const config = configData as PartConfig;

export class ParachuteMk1 extends BasePart {
    id = config.id;
    config = config;

    // State
    isDeployed: boolean = false;
    deployTime: number = 0;

    loadTexture(): string {
        // Re-use the capsule texture or a placeholder for now until we have a specific one
        // Ideally we'd have a specific texture, but let's use a generic gray/white part texture if available
        // For now, let's assume we can use the mk1-pod texture as a placeholder or simply not fail.
        // Actually, let's use a base64 white square as a fallback if no file exists to avoid 404s
        // Or better, let's try to load a local texture.png if we create it, otherwise fallback.
        // Given I cannot easily create an image file, I will rely on a local texture.png being present 
        // OR I will point to the mk1-pod texture for now to ensure it loads.
        // Let's assume we'll just use a simple color in the renderer if texture fails, 
        // but the loader expects a valid URL.
        return new URL('../mk1-pod/texture.png', import.meta.url).href;
    }

    onUpdate(_deltaTime: number, context: PartContext): void {
        // Logic for deployment animation or tracking could go here
        if (context.active && !this.isDeployed) {
            this.isDeployed = true;
            this.deployTime = Date.now();
        }
    }
}

export default new ParachuteMk1();
