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
    private types: Int8Array; // 0=Standard, 1=Blue, 2=RCS
    private maxLifetime: number = 2.5; // Longer for smoke trail
    private emissionRate: number = 8000; // Very high density for continuous flame
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
        this.types = new Int8Array(this.particleCount);

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
    /**
     * Update particle system
     */
    update(deltaTime: number, emitters: Array<{ pos: THREE.Vector3; dir: THREE.Vector3; throttle: number; type?: string }>) {
        if (emitters.length === 0) return;

        // Process emissions for each emitter
        emitters.forEach(emitter => {
            if (emitter.throttle > 0) {
                const effectiveRate = this.emissionRate * emitter.throttle;

                // Track time per emitter?
                // Currently `timeSinceLastEmit` is global. This implies bursty emission if sharing.
                // For simplicity, let's treat emission as global pool but distributed.
                // Or better: pass `deltaTime` * `effectiveRate` = number of particles to emit.

                const count = deltaTime * effectiveRate;
                const intCount = Math.floor(count);
                const prob = count - intCount;
                let particlesToEmit = intCount + (Math.random() < prob ? 1 : 0);

                // Limit max particles per frame per emitter
                particlesToEmit = Math.min(particlesToEmit, 100);

                for (let i = 0; i < particlesToEmit; i++) {
                    this.emitParticle(emitter);
                }
            }
        });

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

                // Drag/Slowdown
                const drag = 0.5 * deltaTime;
                this.velocities[i3] *= (1 - drag);
                this.velocities[i3 + 1] *= (1 - drag);
                this.velocities[i3 + 2] *= (1 - drag);

                // Update color and size based on age
                const age = this.maxLifetime - this.lifetimes[i]; // Time alive

                // Retrieve Type from user data? We don't store type in buffer.
                // We should store 'type' in a float buffer or infer from color?
                // Actually, let's look at initial color to determine evolution?
                // Or just use a simple general evolution.

                // Retrieve Type
                const type = this.types[i]; // 0=Std, 1=Blue, 2=RCS

                // RCS Logic: Simple white puff fading out
                if (type === 2) {
                    const t = 1 - (this.lifetimes[i] / (this.maxLifetime * 0.2)); // Short life normalized
                    // White Fade
                    const alpha = Math.max(0, 1 - t * 2); // Fade fast
                    this.colors[i3] = alpha;
                    this.colors[i3 + 1] = alpha;
                    this.colors[i3 + 2] = alpha;
                    this.sizes[i] = 30 + t * 20; // Slight expansion
                }
                // Blue Flame Logic
                else if (type === 1) { // Blue
                    const flameDuration = 0.4;
                    if (age < flameDuration) {
                        const t = age / flameDuration;
                        this.colors[i3] = 0.2 + t * 0.1; // R
                        this.colors[i3 + 1] = 0.8 - t * 0.4; // G
                        this.colors[i3 + 2] = 1.0; // B
                        this.sizes[i] = 100 + t * 60;
                    } else {
                        // Smoke Phase
                        const t = (age - flameDuration) / (this.maxLifetime - flameDuration);
                        const intensity = 0.5 * (1 - t);
                        this.colors[i3] = 0.3 * intensity;
                        this.colors[i3 + 1] = 0.4 * intensity;
                        this.colors[i3 + 2] = 0.8 * intensity;
                        this.sizes[i] = 150 + t * 250;
                    }
                }
                // Standard Logic
                else {
                    const flameDuration = 0.4;
                    if (age < flameDuration) {
                        const t = age / flameDuration;
                        this.colors[i3] = 1.0;
                        this.colors[i3 + 1] = 1.0 - t * 0.5;
                        this.colors[i3 + 2] = 0.9 - t * 0.9;
                        this.sizes[i] = 80 + t * 40;
                    } else {
                        const t = (age - flameDuration) / (this.maxLifetime - flameDuration);
                        const intensity = 0.5 * (1 - t);
                        this.colors[i3] = 1.0 * intensity;
                        this.colors[i3 + 1] = 0.5 * intensity;
                        this.colors[i3 + 2] = 0.5 * intensity;
                        this.sizes[i] = 120 + t * 200;
                    }
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
                renderPositions[i3 + 2] = 2; // Z=2

                const physicalSize = this.sizes[i];
                const pixelSize = Math.max(8, physicalSize * scale * 2);
                sizes[i] = pixelSize;
            } else {
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
    private emitParticle(config: { pos: THREE.Vector3; dir: THREE.Vector3; throttle: number; type?: string }) {
        const i = this.nextParticleIndex;
        // Advance ring buffer
        this.nextParticleIndex = (this.nextParticleIndex + 1) % this.particleCount;

        const i3 = i * 3;
        const isBlue = config.type === 'blue_flame';
        const isRCS = config.type === 'rcs';

        // Set Type
        let typeVal = 0;
        if (isBlue) typeVal = 1;
        if (isRCS) typeVal = 2;
        this.types[i] = typeVal;

        // Position with randomness
        const nozzleRadius = isRCS ? 0.5 : (isBlue ? 2.5 : 1.5);
        this.physicsPositions[i3] = config.pos.x + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 1] = config.pos.y + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 2] = config.pos.z;

        // Velocity
        const spread = isRCS ? 0.05 : (isBlue ? 0.2 : 0.3); // RCS is very focused
        const speedMult = isRCS ? 3.0 : (isBlue ? 1.5 : 1.0); // RCS is fast puff

        const minSpeed = 50 * speedMult;
        const maxSpeed = (50 + config.throttle * 250) * speedMult;
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

        this.velocities[i3] = config.dir.x * speed + (Math.random() - 0.5) * spread * speed;
        this.velocities[i3 + 1] = config.dir.y * speed + (Math.random() - 0.5) * spread * speed;
        this.velocities[i3 + 2] = config.dir.z * speed + (Math.random() - 0.5) * spread * speed;

        // Lifetime
        if (isRCS) {
            this.lifetimes[i] = 0.3 + Math.random() * 0.2; // Short life
        } else {
            this.lifetimes[i] = this.maxLifetime * (0.8 + Math.random() * 0.4);
        }

        // Initial Color
        if (isRCS) {
            this.colors[i3] = 1.0;
            this.colors[i3 + 1] = 1.0;
            this.colors[i3 + 2] = 1.0;
            this.sizes[i] = 20 + Math.random() * 10;
        } else if (isBlue) {
            this.colors[i3] = 0.2; // R
            this.colors[i3 + 1] = 0.8; // G
            this.colors[i3 + 2] = 1.0; // B
            this.sizes[i] = 100 + Math.random() * 50;
        } else {
            this.colors[i3] = 1.0;
            this.colors[i3 + 1] = 1.0;
            this.colors[i3 + 2] = 0.9;
            this.sizes[i] = 80 + Math.random() * 40;
        }
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
