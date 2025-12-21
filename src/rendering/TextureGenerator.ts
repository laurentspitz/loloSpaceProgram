import * as THREE from 'three';
import { IconGenerator } from '../ui/IconGenerator';
import { Body } from '../core/Body';
import type { SurfaceFeature, ContinentFeature, IceCapFeature } from '../systems/CelestialBodyFeatures';
import { isSurfaceFeature, isContinentFeature, isIceCapFeature } from '../systems/CelestialBodyFeatures';

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
     * Uses feature-based rendering when features are defined
     */
    static createPlanetTexture(body: Body): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Check if body has surface features defined
        const surfaceFeature = body.features?.find(isSurfaceFeature);
        const continentFeature = body.features?.find(isContinentFeature);
        const iceCapFeature = body.features?.find(isIceCapFeature);

        if (body.name === 'Sun') {
            this.drawSun(ctx, size, body);
        } else if (body.type === 'gas_giant') {
            this.drawGasGiantBands(ctx, size, body);
        } else if (surfaceFeature) {
            // Feature-based rendering
            this.drawSurfaceFeature(ctx, size, surfaceFeature);
            if (continentFeature) {
                this.drawContinentFeature(ctx, size, continentFeature);
            }
            if (iceCapFeature) {
                this.drawIceCapFeature(ctx, size, iceCapFeature);
            }
        } else if (body.type === 'moon' || body.name === 'Mercury') {
            this.drawCrateredSurface(ctx, size, body);
        } else {
            // Default: simple gradient
            this.drawDefaultSurface(ctx, size, body);
        }

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Draw the Sun with corona effect
     */
    private static drawSun(ctx: CanvasRenderingContext2D, size: number, body: Body) {
        const rng = this.getSeededRandom(body.name);
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );
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
    }

    /**
     * Draw surface based on SurfaceFeature
     */
    private static drawSurfaceFeature(ctx: CanvasRenderingContext2D, size: number, feature: SurfaceFeature) {
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );

        gradient.addColorStop(0, feature.primaryColor);
        gradient.addColorStop(0.7, feature.secondaryColor || feature.primaryColor);
        gradient.addColorStop(1, feature.tertiaryColor || this.darkenColor(feature.primaryColor, 30));

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    }

    /**
     * Draw continents based on ContinentFeature
     * Supports SVG-based rendering or fallback to ellipse shapes
     */
    private static drawContinentFeature(ctx: CanvasRenderingContext2D, size: number, feature: ContinentFeature) {
        ctx.fillStyle = feature.color;

        // If SVG is specified, we need to handle it asynchronously
        // For now, check if the SVG is already cached
        if (feature.svgUrl && TextureGenerator.svgCache.has(feature.svgUrl)) {
            const svgImage = TextureGenerator.svgCache.get(feature.svgUrl)!;
            const longitudeOffset = TextureGenerator.debugLongitudeOffset ?? (feature.longitudeOffset || 0);

            // The SVG is a world map with 2:1 aspect ratio (360° x 180°)
            // We need to show only half of it (one hemisphere = 180°)
            // The texture size is square, so we need to:
            // 1. Calculate the source width that represents 180° (half of the SVG)
            // 2. Draw that portion into the full texture height

            const svgWidth = svgImage.width;
            const svgHeight = svgImage.height;

            // Source: half of the SVG width (180° of 360° = hemisphere)
            const hemisphereWidth = svgWidth / 2;

            // Calculate offset in SVG coordinates
            // longitudeOffset 0-360 maps to 0-svgWidth
            const srcOffsetX = (longitudeOffset / 360) * svgWidth;

            // Create a temporary canvas to colorize the SVG
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d')!;

            // Draw the hemisphere portion with correct aspect ratio
            // We need to draw from srcOffsetX, taking hemisphereWidth of pixels
            // But we might wrap around the edge, so we draw in two parts if needed

            const srcX1 = srcOffsetX;
            const srcWidth1 = Math.min(hemisphereWidth, svgWidth - srcOffsetX);
            const dstWidth1 = (srcWidth1 / hemisphereWidth) * size;

            // First part: from srcOffsetX to end of SVG (or full hemisphere if it fits)
            tempCtx.drawImage(
                svgImage,
                srcX1, 0, srcWidth1, svgHeight,  // source rectangle
                0, 0, dstWidth1, size            // destination rectangle
            );

            // Second part: wrap around from start of SVG (if needed)
            if (srcWidth1 < hemisphereWidth) {
                const srcWidth2 = hemisphereWidth - srcWidth1;
                const dstX2 = dstWidth1;
                const dstWidth2 = size - dstWidth1;

                tempCtx.drawImage(
                    svgImage,
                    0, 0, srcWidth2, svgHeight,           // source rectangle
                    dstX2, 0, dstWidth2, size              // destination rectangle
                );
            }

            // Apply the green color to the black SVG using composite operation
            // 'source-in' keeps only the parts where both the source and destination overlap
            tempCtx.globalCompositeOperation = 'source-in';
            tempCtx.fillStyle = feature.color;
            tempCtx.fillRect(0, 0, size, size);

            // Now draw the colorized SVG onto the main canvas (on top of the ocean)
            ctx.drawImage(tempCanvas, 0, 0);
        } else if (feature.shapes) {
            // Fallback to ellipse shapes
            for (const shape of feature.shapes) {
                ctx.beginPath();
                ctx.ellipse(
                    shape.x * size,
                    shape.y * size,
                    shape.rx * size,
                    shape.ry * size,
                    shape.rotation || 0,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    }

    // Debug: allows runtime adjustment of longitude offset
    public static debugLongitudeOffset: number | null = null;

    // Cache for loaded SVG images
    private static svgCache: Map<string, HTMLImageElement> = new Map();

    /**
     * Preload an SVG for use in continent rendering
     * @param id - Identifier to reference this SVG (e.g., 'earth')
     * @param url - URL to load the SVG from (use Vite import for correct path)
     */
    public static async preloadSvg(id: string, url: string): Promise<void> {
        if (TextureGenerator.svgCache.has(id)) {
            return; // Already loaded
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                TextureGenerator.svgCache.set(id, img);
                console.log(`[TextureGenerator] Loaded SVG '${id}' from: ${url}`);
                resolve();
            };
            img.onerror = (err) => {
                console.error(`[TextureGenerator] Failed to load SVG '${id}' from: ${url}`, err);
                reject(err);
            };
            img.src = url;
        });
    }

    /**
     * Draw ice caps based on IceCapFeature
     */
    private static drawIceCapFeature(ctx: CanvasRenderingContext2D, size: number, feature: IceCapFeature) {
        const opacity = feature.opacity || 1.0;
        const capSize = feature.size || 0.15;

        // Use solid white for clean edges
        ctx.fillStyle = feature.color || `rgba(255, 255, 255, ${opacity})`;

        if (feature.northPole) {
            ctx.beginPath();
            // Position at top edge (y=0) to avoid blue edge showing
            ctx.ellipse(size * 0.5, size * 0.02, size * capSize * 2.5, size * capSize * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (feature.southPole) {
            ctx.beginPath();
            // Position at bottom edge (y=size) to avoid blue edge
            ctx.ellipse(size * 0.5, size * 0.98, size * capSize * 2.2, size * capSize * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw default surface for bodies without features
     */
    private static drawDefaultSurface(ctx: CanvasRenderingContext2D, size: number, body: Body) {
        const gradient = ctx.createRadialGradient(
            size * 0.35, size * 0.35, size * 0.1,
            size * 0.5, size * 0.5, size * 0.5
        );
        gradient.addColorStop(0, this.lightenColor(body.color, 30));
        gradient.addColorStop(0.7, body.color);
        gradient.addColorStop(1, this.darkenColor(body.color, 30));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
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
    }

    /**
     * Draw cratered surface with 3D lighting effect for moons and Mercury
     * Simulates spherical lighting and crater depth
     */
    private static drawCrateredSurface(ctx: CanvasRenderingContext2D, size: number, body: Body) {
        const rng = this.getSeededRandom(body.name);
        const center = size / 2;

        // Light direction (from top-left, simulating sun)
        const lightAngle = -Math.PI / 4; // 45 degrees from top-left
        const lightX = Math.cos(lightAngle);
        const lightY = Math.sin(lightAngle);

        // Step 1: Base color fill
        ctx.fillStyle = body.color;
        ctx.fillRect(0, 0, size, size);

        // Step 2: Spherical shading - dark shadow on opposite side of light
        // This creates the "terminator" effect
        const shadowGradient = ctx.createLinearGradient(
            center + size * 0.5 * lightX,
            center + size * 0.5 * lightY,
            center - size * 0.5 * lightX,
            center - size * 0.5 * lightY
        );
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.1)');
        shadowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
        shadowGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.55)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(0, 0, size, size);

        // Step 3: Bright highlight spot where light hits (specular)
        const highlightX = center + size * 0.25 * lightX;
        const highlightY = center + size * 0.25 * lightY;
        const highlightGradient = ctx.createRadialGradient(
            highlightX, highlightY, 0,
            highlightX, highlightY, size * 0.4
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.2)');
        highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.fillRect(0, 0, size, size);

        // Step 4: Limb darkening (edges of sphere appear darker)
        const limbGradient = ctx.createRadialGradient(
            center, center, size * 0.3,
            center, center, size * 0.5
        );
        limbGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        limbGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.1)');
        limbGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.25)');
        limbGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = limbGradient;
        ctx.fillRect(0, 0, size, size);

        // Draw craters with 3D depth effect
        const craterCount = body.craters ? body.craters.length * 3 : 50;

        // Sort craters by size (draw big ones first, small ones on top)
        const craters: { x: number; y: number; radius: number }[] = [];
        for (let i = 0; i < craterCount; i++) {
            craters.push({
                x: rng() * size,
                y: rng() * size,
                radius: 3 + rng() * 30
            });
        }
        craters.sort((a, b) => b.radius - a.radius);

        for (const crater of craters) {
            const { x, y, radius } = crater;

            // Crater floor - offset gradient creates concave illusion
            const craterGradient = ctx.createRadialGradient(
                x + radius * 0.35 * lightX,
                y + radius * 0.35 * lightY,
                0,
                x, y, radius
            );
            craterGradient.addColorStop(0, this.darkenColor(body.color, 40));
            craterGradient.addColorStop(0.5, this.darkenColor(body.color, 25));
            craterGradient.addColorStop(0.85, this.darkenColor(body.color, 10));
            craterGradient.addColorStop(1, body.color);

            ctx.fillStyle = craterGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Smooth angular gradient around crater rim using filled wedges
            // Wedges don't have anti-aliased edges between segments
            const rimWidth = radius * 0.15;
            const innerRadius = radius - rimWidth;
            const segments = 36;
            const segmentAngle = (Math.PI * 2) / segments;

            for (let i = 0; i < segments; i++) {
                const angle = i * segmentAngle;
                const startAngle = angle;
                const endAngle = angle + segmentAngle;

                // Calculate lighting based on angle relative to light source
                const midAngle = angle + segmentAngle / 2;
                const angleFromLight = midAngle - lightAngle;
                const litFactor = Math.cos(angleFromLight);

                if (litFactor > 0) {
                    const opacity = litFactor * 0.25;
                    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
                } else {
                    const opacity = -litFactor * 0.12;
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                }

                // Draw filled wedge (annular sector)
                ctx.beginPath();
                ctx.arc(x, y, radius, startAngle, endAngle);
                ctx.arc(x, y, innerRadius, endAngle, startAngle, true);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Add subtle surface texture (small bumps/rocks)
        for (let i = 0; i < 200; i++) {
            const tx = rng() * size;
            const ty = rng() * size;
            const tr = 1 + rng() * 2;
            const brightness = rng() > 0.5 ? 0.05 : -0.08;

            ctx.fillStyle = brightness > 0
                ? `rgba(255, 255, 255, ${brightness})`
                : `rgba(0, 0, 0, ${-brightness})`;
            ctx.beginPath();
            ctx.arc(tx, ty, tr, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rim lighting effect (thin bright edge on shadow side)
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.08)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.48, lightAngle + Math.PI - 0.5, lightAngle + Math.PI + 0.5);
        ctx.stroke();
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
     * @param half Optional: 'top'/'bottom' for horizontal rings, 'left'/'right' for vertical rings
     */
    static createRingTexture(body: Body, ringFeature?: { color?: string }, half?: 'top' | 'bottom' | 'left' | 'right'): THREE.CanvasTexture {
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

        // Draw concentric rings with varying opacity and color variations
        const numBands = 40;

        // Parse the base ring color once outside the loop
        const ringColor = ringFeature?.color || body.color;
        const colorMatch = ringColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        let baseR = 210, baseG = 180, baseB = 140; // Default beige
        if (colorMatch) {
            baseR = parseInt(colorMatch[1]);
            baseG = parseInt(colorMatch[2]);
            baseB = parseInt(colorMatch[3]);
        }

        for (let i = 0; i < numBands; i++) {
            const innerRatio = i / numBands;
            const outerRatio = (i + 1) / numBands;

            const innerRadius = innerRatio * maxRadius;
            const outerRadius = outerRatio * maxRadius;

            // Create subtle color variations (cream, tan, brown tones)
            const variation = rng() * 0.2 - 0.1; // -10% to +10% variation
            const r = Math.min(255, Math.max(0, Math.round(baseR * (1 + variation))));
            const g = Math.min(255, Math.max(0, Math.round(baseG * (1 + variation * 0.8))));
            const b = Math.min(255, Math.max(0, Math.round(baseB * (1 + variation * 0.6))));

            // Simulate gaps in rings (Cassini division effect)
            const gapChance = rng();
            let opacity: number;
            if (gapChance < 0.08) {
                opacity = 0.1; // Dark gap
            } else if (gapChance < 0.2) {
                opacity = 0.3 + rng() * 0.1; // Lighter band
            } else {
                opacity = 0.5 + rng() * 0.35; // Normal band
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
            ctx.fill();
        }

        // Apply half mask if requested
        // 'top'/'bottom' for horizontal rings (like Saturn)
        // 'left'/'right' for vertical rings (like Uranus)
        if (half) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.beginPath();
            if (half === 'top') {
                // Mask out bottom half (keep top half visible)
                ctx.rect(0, centerY, size, centerY);
            } else if (half === 'bottom') {
                // Mask out top half (keep bottom half visible)
                ctx.rect(0, 0, size, centerY);
            } else if (half === 'left') {
                // Mask out right half (keep left half visible)
                ctx.rect(centerX, 0, centerX, size);
            } else if (half === 'right') {
                // Mask out left half (keep right half visible)
                ctx.rect(0, 0, centerX, size);
            }
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Create half-ring texture for 3D ring effect (front or back portion)
     * This creates a semi-circular ring texture with gradient bands
     * @param body The celestial body
     * @param ringFeature Optional RingFeature with color configuration
     * @param isBack If true, creates the back (top) half; if false, creates front (bottom) half
     */
    static createHalfRingTexture(body: Body, ringFeature?: { color?: string }, isBack: boolean = false): THREE.CanvasTexture {
        const rng = this.getSeededRandom(body.name + (isBack ? '_back' : '_front'));
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size / 2; // Half height for half ring
        const ctx = canvas.getContext('2d')!;

        // Clear with transparency
        ctx.clearRect(0, 0, size, size / 2);

        const centerX = size / 2;
        const centerY = isBack ? size / 2 : 0; // Center at bottom for back, top for front
        const maxRadius = size / 2;

        // Draw concentric ring bands (half circles)
        const numBands = 40;
        for (let i = 0; i < numBands; i++) {
            const innerRatio = i / numBands;
            const outerRatio = (i + 1) / numBands;

            const innerRadius = innerRatio * maxRadius;
            const outerRadius = outerRatio * maxRadius;

            // Create varied opacity for realistic band effect
            const baseOpacity = 0.35 + (i % 4) * 0.15;
            const variation = rng() * 0.15 - 0.075;
            const opacity = Math.max(0.15, Math.min(0.85, baseOpacity + variation));

            // Use RingFeature color if provided, otherwise fall back to body color
            const ringColor = ringFeature?.color || body.color;
            const colorMatch = ringColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            let r = 241, g = 196, b = 15; // Default Saturn color
            if (colorMatch) {
                r = parseInt(colorMatch[1]);
                g = parseInt(colorMatch[2]);
                b = parseInt(colorMatch[3]);
            }

            // Add subtle color variation between bands
            const colorVar = Math.floor((rng() - 0.5) * 20);
            r = Math.max(0, Math.min(255, r + colorVar));
            g = Math.max(0, Math.min(255, g + colorVar));
            b = Math.max(0, Math.min(255, b + colorVar * 0.5));

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.beginPath();

            // Draw half arc (PI radians)
            // For back half: draw from 0 to PI (bottom half arc, appears on top when scaled)
            // For front half: draw from PI to 2*PI (top half arc, appears on bottom when scaled)
            const startAngle = isBack ? 0 : Math.PI;
            const endAngle = isBack ? Math.PI : Math.PI * 2;

            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
        }

        // Add Cassini Division for Saturn (dark gap in rings)
        if (body.name === 'Saturn') {
            const cassiniPosition = 0.55; // Position within ring (0-1)
            const cassiniWidth = 0.03;
            const cassiniInner = cassiniPosition * maxRadius;
            const cassiniOuter = (cassiniPosition + cassiniWidth) * maxRadius;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            const startAngle = isBack ? 0 : Math.PI;
            const endAngle = isBack ? Math.PI : Math.PI * 2;
            ctx.arc(centerX, centerY, cassiniOuter, startAngle, endAngle);
            ctx.arc(centerX, centerY, cassiniInner, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Create a spherical 3D lighting overlay texture
     * This creates a transparent overlay that simulates 3D sphere lighting
     * Apply on top of any planet to make it look 3D
     */
    static createSpherical3DOverlay(): THREE.CanvasTexture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const center = size / 2;
        const radius = size / 2;

        // Light direction (from top-left, simulating sun)
        const lightAngle = -Math.PI / 4;
        const lightX = Math.cos(lightAngle);
        const lightY = Math.sin(lightAngle);

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Layer 1: Shadow on the dark side (terminator effect)
        // Use linear gradient for realistic half-lit effect
        const shadowGradient = ctx.createLinearGradient(
            center + radius * lightX,
            center + radius * lightY,
            center - radius * lightX,
            center - radius * lightY
        );
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGradient.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
        shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
        shadowGradient.addColorStop(0.65, 'rgba(0, 0, 0, 0.4)');
        shadowGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.6)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();

        // Layer 2: Specular highlight where light hits
        const highlightX = center + radius * 0.35 * lightX;
        const highlightY = center + radius * 0.35 * lightY;
        const highlightGradient = ctx.createRadialGradient(
            highlightX, highlightY, 0,
            highlightX, highlightY, radius * 0.5
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        highlightGradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();

        // Layer 3: Limb darkening (edges of sphere are darker)
        const limbGradient = ctx.createRadialGradient(
            center, center, radius * 0.5,
            center, center, radius
        );
        limbGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        limbGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
        limbGradient.addColorStop(0.75, 'rgba(0, 0, 0, 0.15)');
        limbGradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.3)');
        limbGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = limbGradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();

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
