import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

/**
 * Background - Manages the scene background (starfield and nebulas)
 */
export class Background {
    static createBackground(): THREE.Group {
        const group = new THREE.Group();

        // 1. Starfield
        const stars = this.createStarfield();
        group.add(stars);

        // 2. Nebulas
        const nebulas = this.createNebulas();
        group.add(nebulas);

        return group;
    }

    static createStarfield(): THREE.Points {
        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 5000; // Increased count
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        // Create a large field, but we'll move it with the camera
        const spread = 4000;

        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 2] = -500; // Behind everything

            // Varied star sizes (1.0 to 4.0 pixels) - explicit variation
            sizes[i] = 1.0 + Math.random() * 3.0;

            // Color variation
            const brightness = 0.5 + Math.random() * 0.5;
            const type = Math.random();

            if (type > 0.9) {
                // Blue giant
                colors[i * 3] = brightness * 0.8;
                colors[i * 3 + 1] = brightness * 0.9;
                colors[i * 3 + 2] = brightness;
            } else if (type > 0.7) {
                // Red dwarf / Giant
                colors[i * 3] = brightness;
                colors[i * 3 + 1] = brightness * 0.6;
                colors[i * 3 + 2] = brightness * 0.6;
            } else {
                // Main sequence white/yellow
                colors[i * 3] = brightness;
                colors[i * 3 + 1] = brightness;
                colors[i * 3 + 2] = brightness * 0.9;
            }
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Use ShaderMaterial to support per-vertex point sizes
        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                scale: { value: 1.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size; // Fixed pixel size on screen, independent of zoom
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    // Circular point
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if(length(coord) > 0.5) discard;
                    
                    // Soft edge
                    float strength = 1.0 - (length(coord) * 2.0);
                    gl_FragColor = vec4(vColor, strength);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        return new THREE.Points(starsGeometry, starsMaterial);
    }

    static createNebulas(): THREE.Group {
        const group = new THREE.Group();

        // Create a few decorative nebulas
        const configs = [
            { color: '#440066', count: 3, spread: 2000 }, // Purple
            { color: '#003366', count: 4, spread: 2500 }, // Blue
            { color: '#660000', count: 2, spread: 3000 }  // Red
        ];

        configs.forEach(config => {
            const texture = TextureGenerator.createNebulaTexture(config.color);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            for (let i = 0; i < config.count; i++) {
                const sprite = new THREE.Sprite(material);

                // Random position
                const x = (Math.random() - 0.5) * config.spread;
                const y = (Math.random() - 0.5) * config.spread;

                sprite.position.set(x, y, -510); // Behind stars

                // Random large scale
                const scale = 500 + Math.random() * 1000;
                sprite.scale.set(scale, scale, 1);

                group.add(sprite);
            }
        });

        return group;
    }
}
