import * as THREE from 'three';
import { IconGenerator } from '../ui/IconGenerator';
import { Body } from '../core/Body';

/**
 * TextureGenerator - Handles all procedural texture generation for celestial bodies
 * Extracted from ThreeRenderer to improve code organization
 */
export class TextureGenerator {
    /**
     * Generate a seeded random number generator for deterministic procedural generation
     * This ensures textures remain consistent across zoom levels
     */
    private static getSeededRandom(seedStr: string): () => number {
        let h = 0x811c9dc5;
        for (let i = 0; i < seedStr.length; i++) {
            h ^= seedStr.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        let seed = h >>> 0;

        return () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    /**
     * Main entry point - creates appropriate texture for any celestial body
     */
    static createPlanetTexture(body: Body): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Create radial gradient for basic shading
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );

        if (body.name === 'Sun') {
            const rng = this.getSeededRandom(body.name);
            // Sun: bright yellow-orange gradient with corona effect
            gradient.addColorStop(0, '#ffffcc');
            gradient.addColorStop(0.3, '#ffff88');
            gradient.addColorStop(0.6, '#ffaa00');
            gradient.addColorStop(1, '#ff6600');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);

            // Add some solar texture
            for (let i = 0; i < 50; i++) {
                const x = rng() * size;
                const y = rng() * size;
                const radius = 5 + rng() * 15;
                ctx.fillStyle = `rgba(255, 200, 0, ${0.1 + rng() * 0.2})`;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (body.type === 'gas_giant') {
            this.drawGasGiantBands(ctx, size, body);
        } else if (body.name === 'Earth') {
            this.drawEarth(ctx, size);
        } else if (body.name === 'Mars') {
            this.drawMars(ctx, size);
        } else if (body.name === 'Venus') {
            this.drawVenus(ctx, size);
        } else if (body.type === 'moon' || body.name === 'Mercury') {
            this.drawCrateredSurface(ctx, size, body);
        } else {
            // Default: simple gradient
            gradient.addColorStop(0, this.lightenColor(body.color, 30));
            gradient.addColorStop(0.7, body.color);
            gradient.addColorStop(1, this.darkenColor(body.color, 30));
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
        }

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Draw banded atmosphere for gas giants (Jupiter, Saturn, Uranus, Neptune)
     */
    private static drawGasGiantBands(ctx: CanvasRenderingContext2D, size: number, body: Body) {
        const rng = this.getSeededRandom(body.name);
        const bands = 12;
        const bandHeight = size / bands;

        for (let i = 0; i < bands; i++) {
            const y = i * bandHeight;

            // Alternate between lighter and darker bands
            const isDark = i % 2 === 0;
            const baseColor = body.color;
            const bandColor = isDark ? this.darkenColor(baseColor, 15) : this.lightenColor(baseColor, 10);

            // Add some horizontal variation
            const gradient = ctx.createLinearGradient(0, y, 0, y + bandHeight);
            gradient.addColorStop(0, bandColor);
            gradient.addColorStop(0.5, isDark ? this.darkenColor(baseColor, 20) : baseColor);
            gradient.addColorStop(1, bandColor);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, y, size, bandHeight);

            // Add some turbulence
            for (let j = 0; j < 5; j++) {
                const x = rng() * size;
                const turbY = y + rng() * bandHeight;
                const width = 20 + rng() * 40;
                const height = 3 + rng() * 5;

                ctx.fillStyle = `rgba(${isDark ? '0,0,0' : '255,255,255'}, ${0.1 + rng() * 0.1})`;
                ctx.fillRect(x, turbY, width, height);
            }
        }

        // Add Great Red Spot for Jupiter
        if (body.name === 'Jupiter') {
            const spotX = size * 0.6;
            const spotY = size * 0.55;
            const spotRadiusX = size * 0.15;
            const spotRadiusY = size * 0.1;

            ctx.fillStyle = 'rgba(178, 34, 34, 0.7)';
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, spotRadiusX, spotRadiusY, 0, 0, Math.PI * 2);
            ctx.fill();

            // Add inner detail
            ctx.fillStyle = 'rgba(200, 50, 50, 0.5)';
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, spotRadiusX * 0.6, spotRadiusY * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw cratered surface for moons and Mercury
     */
    private static drawCrateredSurface(ctx: CanvasRenderingContext2D, size: number, body: Body) {
        const rng = this.getSeededRandom(body.name);
        // Base gradient
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );
        gradient.addColorStop(0, this.lightenColor(body.color, 30));
        gradient.addColorStop(0.7, body.color);
        gradient.addColorStop(1, this.darkenColor(body.color, 30));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Draw craters
        const craterCount = body.craters ? body.craters.length * 3 : 40; // More craters
        for (let i = 0; i < craterCount; i++) {
            const x = rng() * size;
            const y = rng() * size;
            const radius = 5 + rng() * 25;

            // Crater shadow
            ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + rng() * 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Crater rim highlight
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + rng() * 0.1})`;
            ctx.beginPath();
            ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw Earth with continents and ice caps
     */
    private static drawEarth(ctx: CanvasRenderingContext2D, size: number) {
        // Ocean base
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );
        gradient.addColorStop(0, '#4da6ff');
        gradient.addColorStop(0.7, '#0066cc');
        gradient.addColorStop(1, '#004080');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Continents (simplified)
        ctx.fillStyle = '#7cb342';

        // North America
        ctx.beginPath();
        ctx.ellipse(size * 0.25, size * 0.3, size * 0.12, size * 0.15, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // South America
        ctx.beginPath();
        ctx.ellipse(size * 0.3, size * 0.55, size * 0.08, size * 0.12, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Europe/Africa
        ctx.beginPath();
        ctx.ellipse(size * 0.52, size * 0.35, size * 0.1, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Asia
        ctx.beginPath();
        ctx.ellipse(size * 0.7, size * 0.3, size * 0.15, size * 0.12, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Australia
        ctx.beginPath();
        ctx.ellipse(size * 0.75, size * 0.6, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arctic ice cap
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(size * 0.5, size * 0.08, size * 0.4, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Antarctica (bottom, partial)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(size * 0.5, size * 0.92, size * 0.35, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Clouds are now drawn in a separate layer
    }

    /**
     * Draw Mars with reddish surface and polar ice caps
     */
    private static drawMars(ctx: CanvasRenderingContext2D, size: number) {
        const rng = this.getSeededRandom('Mars');
        // Reddish base with gradient
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );
        gradient.addColorStop(0, '#ff6b4a');
        gradient.addColorStop(0.7, '#E74C3C');
        gradient.addColorStop(1, '#a83226');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Darker regions (maria)
        ctx.fillStyle = 'rgba(100, 30, 20, 0.3)';
        for (let i = 0; i < 8; i++) {
            const x = rng() * size;
            const y = rng() * size;
            const radius = 30 + rng() * 60;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Polar ice caps
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        // North pole
        ctx.beginPath();
        ctx.arc(size * 0.5, size * 0.1, size * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // South pole
        ctx.beginPath();
        ctx.arc(size * 0.5, size * 0.9, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw Venus with thick yellowish atmosphere
     */
    private static drawVenus(ctx: CanvasRenderingContext2D, size: number) {
        // Yellowish base
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );
        gradient.addColorStop(0, '#fff4a3');
        gradient.addColorStop(0.7, '#F1C40F');
        gradient.addColorStop(1, '#c9a00c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Clouds are now drawn in a separate layer
    }

    /**
     * Create animated cloud texture for Earth and Venus
     */
    static createCloudTexture(body: Body): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const rng = this.getSeededRandom(body.name + "_clouds");

        if (body.name === 'Earth') {
            // Earth clouds - smaller and more numerous for better scale
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            const cloudCount = 150;
            for (let i = 0; i < cloudCount; i++) {
                const x = rng() * size;
                const y = rng() * size;
                const r = (0.005 + rng() * 0.02) * size; // Much smaller clouds

                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();

                // Add some fluffiness
                for (let j = 0; j < 4; j++) {
                    ctx.beginPath();
                    ctx.arc(x + (rng() - 0.5) * r * 1.5, y + (rng() - 0.5) * r * 1.5, r * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (body.name === 'Venus') {
            // Venus thick clouds
            ctx.fillStyle = 'rgba(243, 200, 100, 0.4)';
            for (let i = 0; i < 30; i++) {
                const x = rng() * size;
                const y = rng() * size;
                const width = 40 + rng() * 120;
                const height = 15 + rng() * 40;
                const angle = rng() * Math.PI;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.fillRect(-width / 2, -height / 2, width, height);
                ctx.restore();
            }
        }

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Create ring texture for Saturn and Uranus
     */
    static createRingTexture(body: Body): THREE.CanvasTexture {
        const rng = this.getSeededRandom(body.name);
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Create radial gradient for ring bands
        const centerX = size / 2;
        const centerY = size / 2;
        const maxRadius = size / 2;

        // Draw concentric rings with varying opacity
        const numBands = 30;
        for (let i = 0; i < numBands; i++) {
            const innerRatio = i / numBands;
            const outerRatio = (i + 1) / numBands;

            const innerRadius = innerRatio * maxRadius;
            const outerRadius = outerRatio * maxRadius;

            // Alternate opacity for band effect
            const opacity = 0.3 + (i % 3) * 0.2 + rng() * 0.1;

            // Parse ring color
            const ringColor = body.ringColor || body.color;
            const colorMatch = ringColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            let r = 241, g = 196, b = 15; // Default Saturn color
            if (colorMatch) {
                r = parseInt(colorMatch[1]);
                g = parseInt(colorMatch[2]);
                b = parseInt(colorMatch[3]);
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Color utility: lighten a hex color by a percentage
     */
    static lightenColor(color: string, percent: number): string {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * Color utility: darken a hex color by a percentage
     */
    static darkenColor(color: string, percent: number): string {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * Color utility: parse color string to THREE.js color number
     */
    static parseColor(colorString: string): number {
        if (colorString.startsWith('#')) {
            return parseInt(colorString.replace('#', '0x'));
        }
        // Default fallback
        return 0xffffff;
    }
    /**
     * Create a soft glow texture for particles
     */
    static createParticleTexture(): THREE.CanvasTexture {
        const size = 128; // Larger texture for better quality
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Radial gradient for soft glow
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );

        // Very soft core
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Create a target icon for maneuver nodes (blue)
     */
    static createManeuverIcon(): THREE.CanvasTexture {
        const size = 64;
        const canvas = IconGenerator.createManeuverIcon(size); // Uses default blue
        return new THREE.CanvasTexture(canvas);
    }
}
