import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

/**
 * ThrustParticleSystem - Particle-based rocket thrust effect
 */
export class ThrustParticleSystem {
    private particles: THREE.Points;
    private particleCount: number = 10000; // Increased for smoke trail
    private physicsPositions: Float64Array;
    private velocities: Float32Array;
    private lifetimes: Float32Array;
    private sizes: Float32Array;
    private colors: Float32Array;
    private maxLifetime: number = 2.5; // Longer for smoke trail
    private emissionRate: number = 8000; // Very high density for continuous flame
    private timeSinceLastEmit: number = 0;
    private activeParticles: number = 0;
    private nextParticleIndex: number = 0; // Ring buffer index

    constructor() {
        // Initialize particle buffers
        this.physicsPositions = new Float64Array(this.particleCount * 3);
        const renderPositions = new Float32Array(this.particleCount * 3); // Screen space positions for rendering
        this.velocities = new Float32Array(this.particleCount * 3);
        this.lifetimes = new Float32Array(this.particleCount);
        this.sizes = new Float32Array(this.particleCount);
        this.colors = new Float32Array(this.particleCount * 3);

        // Initialize all particles as dead
        for (let i = 0; i < this.particleCount; i++) {
            this.lifetimes[i] = 0;
        }

        // Create particle geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(renderPositions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        // Create particle texture
        const texture = TextureGenerator.createParticleTexture();

        // Create custom shader material for per-particle sizing and soft texture
        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: texture }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_PointSize = size;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4( vColor, 1.0 );
                    gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
                    // Lower threshold for softer edges
                    if (gl_FragColor.a < 0.001) discard;
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.frustumCulled = false;
        this.particles.renderOrder = 999;
    }

    /**
     * Update particle system
     */
    update(deltaTime: number, throttle: number, emitPosition: THREE.Vector3, emitDirection: THREE.Vector3) {
        // Emit new particles based on throttle
        if (throttle > 0) {
            this.timeSinceLastEmit += deltaTime;
            const emitInterval = 1 / (this.emissionRate * throttle);

            // Limit max particles emitted per frame to avoid freezing
            const maxEmitPerFrame = 200;
            let emitted = 0;

            while (this.timeSinceLastEmit >= emitInterval && emitted < maxEmitPerFrame) {
                this.emitParticle(emitPosition, emitDirection, throttle);
                this.timeSinceLastEmit -= emitInterval;
                emitted++;
            }
        }

        // Update existing particles
        this.activeParticles = 0;
        for (let i = 0; i < this.particleCount; i++) {
            if (this.lifetimes[i] > 0) {
                this.activeParticles++;
                // Update lifetime
                this.lifetimes[i] -= deltaTime;

                if (this.lifetimes[i] <= 0) {
                    continue;
                }

                // Update position
                const i3 = i * 3;
                this.physicsPositions[i3] += this.velocities[i3] * deltaTime;
                this.physicsPositions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
                this.physicsPositions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;

                // Drag/Slowdown for smoke effect
                // Smoke slows down over time
                const drag = 0.5 * deltaTime;
                this.velocities[i3] *= (1 - drag);
                this.velocities[i3 + 1] *= (1 - drag);
                this.velocities[i3 + 2] *= (1 - drag);

                // Update color and size based on age
                const age = this.maxLifetime - this.lifetimes[i]; // Time alive

                // Flame phase (0 - 0.3s) -> Smoke phase (> 0.3s)
                const flameDuration = 0.4;

                if (age < flameDuration) {
                    // FLAME: White -> Yellow -> Orange
                    const t = age / flameDuration;
                    this.colors[i3] = 1.0; // R
                    this.colors[i3 + 1] = 1.0 - t * 0.5; // G (1.0 -> 0.5)
                    this.colors[i3 + 2] = 0.9 - t * 0.9; // B (0.9 -> 0.0)

                    // Size grows slightly
                    this.sizes[i] = 80 + t * 40;
                } else {
                    // SMOKE: Orange -> Faint Grey -> Transparent
                    const t = (age - flameDuration) / (this.maxLifetime - flameDuration);

                    // Fade out color intensity
                    const intensity = 0.5 * (1 - t);
                    this.colors[i3] = 1.0 * intensity; // Red tint fading
                    this.colors[i3 + 1] = 0.5 * intensity; // Orange tint fading
                    this.colors[i3 + 2] = 0.5 * intensity; // Greyish

                    // Smoke expands significantly
                    this.sizes[i] = 120 + t * 200;
                }
            }
        }
    }

    /**
     * Update geometry buffers with transformed positions for rendering
     */
    updateGeometry(center: { x: number, y: number }, scale: number) {
        const geometry = this.particles.geometry as THREE.BufferGeometry;
        const renderPositions = geometry.attributes.position.array as Float32Array;
        const sizes = geometry.attributes.size.array as Float32Array;

        for (let i = 0; i < this.particleCount; i++) {
            if (this.lifetimes[i] > 0) {
                const i3 = i * 3;
                // Transform physics position to screen position
                const x = (this.physicsPositions[i3] - center.x) * scale;
                const y = (this.physicsPositions[i3 + 1] - center.y) * scale;

                renderPositions[i3] = x;
                renderPositions[i3 + 1] = y;
                renderPositions[i3 + 2] = 2; // Z=2 to ensure visibility on top of planets/rocket

                // Calculate size in pixels
                const physicalSize = this.sizes[i];
                // Scale size but clamp to avoid disappearing
                const pixelSize = Math.max(8, physicalSize * scale * 2);
                sizes[i] = pixelSize;

            } else {
                // Move dead particles out of view
                const i3 = i * 3;
                renderPositions[i3] = 0;
                renderPositions[i3 + 1] = 0;
                renderPositions[i3 + 2] = -1000;
                sizes[i] = 0;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
    }

    /**
     * Emit a new particle using Ring Buffer
     */
    private emitParticle(position: THREE.Vector3, direction: THREE.Vector3, throttle: number) {
        const i = this.nextParticleIndex;

        // Advance ring buffer
        this.nextParticleIndex = (this.nextParticleIndex + 1) % this.particleCount;

        const i3 = i * 3;

        // Set position with slight randomness (nozzle width)
        const nozzleRadius = 1.5;

        this.physicsPositions[i3] = position.x + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 1] = position.y + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 2] = position.z;

        // Set velocity (exhaust direction + randomness)
        const spread = 0.3;

        // Speed calculation: always have slow particles near engine, throttle extends the maximum range
        // Min speed (always present): 50 m/s -> stays near engine
        // Max speed (scales with throttle): 50 + throttle * 250 -> extends flame length
        // At throttle=0.1: 50-75 m/s (short flame)
        // At throttle=1.0: 50-300 m/s (long flame from engine to far tip)
        const minSpeed = 50;
        const maxSpeed = 50 + throttle * 250;
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

        this.velocities[i3] = direction.x * speed + (Math.random() - 0.5) * spread * speed;
        this.velocities[i3 + 1] = direction.y * speed + (Math.random() - 0.5) * spread * speed;
        this.velocities[i3 + 2] = direction.z * speed + (Math.random() - 0.5) * spread * speed;

        // Set lifetime (randomized)
        this.lifetimes[i] = this.maxLifetime * (0.8 + Math.random() * 0.4);

        // Set initial color (white/bright yellow)
        this.colors[i3] = 1.0;
        this.colors[i3 + 1] = 1.0;
        this.colors[i3 + 2] = 0.9;

        // Set initial size
        this.sizes[i] = 80 + Math.random() * 40;
    }

    /**
     * Get the THREE.Points object for adding to scene
     */
    getParticles(): THREE.Points {
        return this.particles;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.particles.geometry.dispose();
        (this.particles.material as THREE.Material).dispose();
    }
}
