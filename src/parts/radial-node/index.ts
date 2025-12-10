import { BasePart } from '../BasePart';
import type { PartConfig } from '../PartConfig';
import configData from './config.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config = configData as PartConfig;

/**
 * Radial Node - Custom attachment point
 * This part has a procedurally generated texture
 */
export class RadialNode extends BasePart {
    id = config.id;
    config = config;

    locales = {
        en: en,
        fr: fr
    };

    /**
     * Generate the texture procedurally (same as PartRegistry.createNodeTexture)
     */
    loadTexture(): string {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;

        // Orange center
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();

        // Blue border (distinct from green nodes)
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Inner detail (Orientation Arrow)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Triangle pointing UP
        ctx.moveTo(32, 15); // Tip
        ctx.lineTo(22, 40); // Bottom Left
        ctx.lineTo(42, 40); // Bottom Right
        ctx.closePath();
        ctx.fill();

        return canvas.toDataURL();
    }
}

export default new RadialNode();
