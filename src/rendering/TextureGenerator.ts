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
     * Now includes edge fade to prevent hard clipping at planet boundary
     */
    static createCloudTexture(body: Body): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const rng = this.getSeededRandom(body.name + "_clouds");

        const centerX = size / 2;
        const centerY = size / 2;
        const maxRadius = size / 2;

        if (body.name === 'Earth') {
            // Earth clouds - uniform distribution using sqrt for radius
            // This prevents concentration in the center
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            const cloudCount = 200;
            for (let i = 0; i < cloudCount; i++) {
                const angle = rng() * Math.PI * 2;
                // sqrt(rng) gives uniform distribution in a circle
                const dist = Math.sqrt(rng()) * 0.92 * maxRadius;
                const x = centerX + Math.cos(angle) * dist;
                const y = centerY + Math.sin(angle) * dist;
                const r = (0.008 + rng() * 0.025) * size;

                // Draw cloud as group of overlapping circles for fluffy look
                const blobCount = 3 + Math.floor(rng() * 4);
                for (let b = 0; b < blobCount; b++) {
                    const bx = x + (rng() - 0.5) * r * 2;
                    const by = y + (rng() - 0.5) * r * 2;
                    const br = r * (0.5 + rng() * 0.5);
                    ctx.beginPath();
                    ctx.arc(bx, by, br, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (body.name === 'Venus') {
            // Venus thick clouds - bands
            ctx.fillStyle = 'rgba(243, 200, 100, 0.35)';
            for (let i = 0; i < 40; i++) {
                const angle = rng() * Math.PI * 2;
                const dist = Math.sqrt(rng()) * 0.9 * maxRadius;
                const x = centerX + Math.cos(angle) * dist;
                const y = centerY + Math.sin(angle) * dist;
                const width = 30 + rng() * 80;
                const height = 8 + rng() * 20;
                const rotAngle = rng() * Math.PI;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotAngle);
                // Rounded rectangle for softer look
                ctx.beginPath();
                ctx.roundRect(-width / 2, -height / 2, width, height, height / 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Apply circular mask with soft edge fade to prevent clouds being cut
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        const fadeStart = 0.85; // Start fading at 85% of radius

        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const dx = px - centerX;
                const dy = py - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy) / maxRadius;

                let alpha = 1.0;
                if (dist > fadeStart) {
                    // Smooth quadratic fade from fadeStart to 1.0
                    const t = (dist - fadeStart) / (1.0 - fadeStart);
                    alpha = 1.0 - (t * t);
                }
                if (dist > 1.0) {
                    alpha = 0;
                }

                const idx = (py * size + px) * 4;
                data[idx + 3] = Math.floor(data[idx + 3] * Math.max(0, alpha));
            }
        }

        ctx.putImageData(imageData, 0, 0);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Create atmospheric cloud texture for clouds between configurable altitudes
     * Uses a ring-shaped texture with smooth fade at inner and outer edges
     * @param body The celestial body (Earth or Venus)
     * @param cloudFeature Optional CloudFeature with altitude configuration
     */
    static createAtmosphericCloudTexture(body: Body, cloudFeature?: { altitudeMin?: number; altitudeMax?: number }): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const rng = this.getSeededRandom(body.name + "_atmos_clouds");

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        const centerX = size / 2;
        const centerY = size / 2;
        const maxRadius = size / 2;

        // Calculate correct ratios based on actual altitudes
        // Use CloudFeature altitudes if provided, otherwise defaults
        const atmosScale = body.atmosphereRadiusScale || 1.15;
        const bodyRadius = body.radius; // in meters

        // Use feature altitudes or defaults
        const innerAltitude = cloudFeature?.altitudeMin ?? 1000; // Default 1km
        const outerAltitude = cloudFeature?.altitudeMax ?? 80000; // Default 80km

        // Calculate the ratios within the texture
        // Texture goes from 0 (center) to 1.0 (at atmosScale radius)
        // Ratio = (bodyRadius + altitude) / (bodyRadius * atmosScale)
        const innerCloudRatio = (bodyRadius + innerAltitude) / (bodyRadius * atmosScale);
        const outerCloudRatio = (bodyRadius + outerAltitude) / (bodyRadius * atmosScale);

        // Fade margins for soft edges (in ratio space)
        const fadeMargin = 0.02; // Soft transition zone

        // Draw fluffy atmospheric clouds with organic shapes
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';

        const cloudCount = 80; // Fewer but larger cloud formations
        for (let i = 0; i < cloudCount; i++) {
            // Position cloud formation within the altitude band
            const angle = rng() * Math.PI * 2;
            const radiusRatio = innerCloudRatio + rng() * (outerCloudRatio - innerCloudRatio);
            const cloudRadius = radiusRatio * maxRadius;

            const cx = centerX + Math.cos(angle) * cloudRadius;
            const cy = centerY + Math.sin(angle) * cloudRadius;

            // Calculate opacity based on distance from boundaries
            const normalizedPos = (radiusRatio - innerCloudRatio) / (outerCloudRatio - innerCloudRatio);
            const innerFade = Math.min(1.0, normalizedPos * 3);
            const outerFade = Math.min(1.0, (1.0 - normalizedPos) * 3);
            const edgeFade = Math.min(innerFade, outerFade);

            ctx.globalAlpha = 0.15 * edgeFade;

            // Draw cloud as cluster of overlapping circles (fluffy shape)
            const blobCount = 4 + Math.floor(rng() * 6);
            const cloudSize = (0.015 + rng() * 0.03) * size;

            for (let b = 0; b < blobCount; b++) {
                // Blobs arranged in elongated pattern (like real clouds)
                const blobAngle = angle + (rng() - 0.5) * 0.3;
                const blobOffset = (rng() - 0.5) * cloudSize * 2;
                const bx = cx + Math.cos(blobAngle) * blobOffset + (rng() - 0.5) * cloudSize;
                const by = cy + Math.sin(blobAngle) * blobOffset + (rng() - 0.5) * cloudSize;
                const br = cloudSize * (0.4 + rng() * 0.6);

                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
            }

            // Add wispy extensions
            for (let w = 0; w < 2; w++) {
                const wispAngle = angle + (rng() - 0.5) * 0.4;
                const wispDist = cloudSize * (1.5 + rng() * 1.5);
                const wx = cx + Math.cos(wispAngle) * wispDist;
                const wy = cy + Math.sin(wispAngle) * wispDist;
                const wr = cloudSize * (0.2 + rng() * 0.3);

                ctx.globalAlpha = 0.08 * edgeFade;
                ctx.beginPath();
                ctx.arc(wx, wy, wr, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1.0;

        // Apply radial mask with very gradual fade at boundaries
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const dx = px - centerX;
                const dy = py - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy) / maxRadius;

                // Smooth fade using cosine interpolation for natural look
                let alpha = 1.0;

                if (dist < innerCloudRatio - fadeMargin) {
                    // Fully transparent inside planet
                    alpha = 0;
                } else if (dist < innerCloudRatio + fadeMargin) {
                    // Smooth fade-in at inner edge
                    const t = (dist - (innerCloudRatio - fadeMargin)) / (fadeMargin * 2);
                    alpha = t * t; // Quadratic ease-in
                } else if (dist > outerCloudRatio - fadeMargin && dist <= outerCloudRatio + fadeMargin) {
                    // Smooth fade-out at outer edge
                    const t = (dist - (outerCloudRatio - fadeMargin)) / (fadeMargin * 2);
                    alpha = 1.0 - (t * t); // Quadratic ease-out
                } else if (dist > outerCloudRatio + fadeMargin) {
                    // Fully transparent beyond outer edge
                    alpha = 0;
                }

                const idx = (py * size + px) * 4;
                data[idx + 3] = Math.floor(data[idx + 3] * Math.max(0, Math.min(1, alpha)));
            }
        }

        ctx.putImageData(imageData, 0, 0);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Create ring texture for Saturn and Uranus
     * @param body The celestial body
     * @param ringFeature Optional RingFeature with color configuration
     */
    static createRingTexture(body: Body, ringFeature?: { color?: string }): THREE.CanvasTexture {
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

            // Use RingFeature color if provided, otherwise fall back to body color
            const ringColor = ringFeature?.color || body.color;
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
     * Create a soft particle texture
     */
    static createParticleTexture(): THREE.CanvasTexture {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Create smooth gaussian gradient for soft edges
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;

        // Draw gradient pixel by pixel for perfect gaussian
        const imageData = ctx.createImageData(size, size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const normalized = distance / radius;

                // Gaussian falloff for very soft edges
                const alpha = Math.exp(-normalized * normalized * 4); // Gaussian with sigma=0.5

                const index = (y * size + x) * 4;
                imageData.data[index] = 255;     // R
                imageData.data[index + 1] = 255; // G
                imageData.data[index + 2] = 255; // B
                imageData.data[index + 3] = alpha * 255; // A
            }
        }
        ctx.putImageData(imageData, 0, 0);

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

    /**
     * Create a nebula cloud texture
     */
    static createNebulaTexture(color: string): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Clear
        ctx.fillStyle = '#00000000';
        ctx.clearRect(0, 0, size, size);

        // Draw random "clouds" - composition of radial gradients
        const rng = () => Math.random();

        const centerR = parseInt(color.slice(1, 3), 16);
        const centerG = parseInt(color.slice(3, 5), 16);
        const centerB = parseInt(color.slice(5, 7), 16);

        // 1. Draw overlapping soft circles
        // Increased count and opacity for visibility
        const numBlobs = 40; // Increased from 30

        for (let i = 0; i < numBlobs; i++) {
            // Distribute points using Gaussian-like distribution around center
            const u = 1 - rng();
            const v = rng();
            const radius_dist = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const x = (0.5 + radius_dist * 0.15) * size;

            const u2 = 1 - rng();
            const v2 = rng();
            const radius_dist2 = Math.sqrt(-2.0 * Math.log(u2)) * Math.cos(2.0 * Math.PI * v2);
            const y = (0.5 + radius_dist2 * 0.15) * size;

            // Radius varies
            const r = (0.15 + rng() * 0.25) * size; // Larger blobs (15-40%)

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
            // Reduced alpha to soften the effect
            const alpha = 0.04 + rng() * 0.06;

            gradient.addColorStop(0, `rgba(${centerR}, ${centerG}, ${centerB}, ${alpha})`);
            gradient.addColorStop(0.4, `rgba(${centerR}, ${centerG}, ${centerB}, ${alpha * 0.5})`);
            gradient.addColorStop(1, `rgba(${centerR}, ${centerG}, ${centerB}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Global Vignette
        // Relaxed vignette start point (0.3 -> 0.4) to keep more content visible
        ctx.globalCompositeOperation = 'destination-in';
        const vignette = ctx.createRadialGradient(
            size * 0.5, size * 0.5, size * 0.4,
            size * 0.5, size * 0.5, size * 0.5
        );
        vignette.addColorStop(0, 'rgba(0,0,0,1)');
        vignette.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    /**
     * Create atmosphere halo texture with soft gradient
     */
    static createAtmosphereHalo(color: string, opacity: number = 0.5): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Clear
        ctx.clearRect(0, 0, size, size);

        // Create radial gradient
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;

        const gradient = ctx.createRadialGradient(
            centerX, centerY, radius * 0.7, // Start fading from 70% radius
            centerX, centerY, radius
        );

        // Parse color
        const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        let r = 255, g = 255, b = 255;

        if (colorMatch) {
            r = parseInt(colorMatch[1]);
            g = parseInt(colorMatch[2]);
            b = parseInt(colorMatch[3]);
        } else if (color.startsWith('#')) {
            const num = parseInt(color.replace('#', ''), 16);
            r = (num >> 16) & 255;
            g = (num >> 8) & 255;
            b = num & 255;
        }

        // Inner part (transparent or faint color to blend with planet)
        // We want the atmosphere to be visible mostly as a rim/halo
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${opacity * 0.2})`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${opacity})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`); // Fade to zero at edge

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
}
